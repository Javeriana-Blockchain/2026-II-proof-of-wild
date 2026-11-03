#![no_std]

mod types;

#[cfg(test)]
mod test;

use soroban_sdk::{
    contract, contractevent, contractimpl, token, Address, BytesN, Env, Symbol, Vec,
};
use types::{Case, Config, DataKey, Error, Milestone, Proposal, ProposalStatus};

const DAY_LEDGERS: u32 = 17_280;
const TTL_THRESHOLD: u32 = 30 * DAY_LEDGERS;
const TTL_EXTEND_TO: u32 = 90 * DAY_LEDGERS;

#[contractevent]
pub struct OrgAuthorized {
    #[topic]
    pub org: Address,
}

#[contractevent]
pub struct CaseRegistered {
    #[topic]
    pub case_id: u32,
    pub org: Address,
    pub goal: i128,
    pub meta_hash: BytesN<32>,
}

#[contractevent]
pub struct Donation {
    #[topic]
    pub case_id: u32,
    pub donor: Address,
    pub amount: i128,
}

#[contractevent]
pub struct DisbursementProposed {
    #[topic]
    pub case_id: u32,
    pub proposal_id: u32,
    pub amount: i128,
    pub evidence_hash: BytesN<32>,
}

#[contractevent]
pub struct DisbursementApproved {
    #[topic]
    pub proposal_id: u32,
    pub approver: Address,
    pub approvals: u32,
}

#[contractevent]
pub struct DisbursementExecuted {
    #[topic]
    pub case_id: u32,
    pub proposal_id: u32,
    pub amount: i128,
}

#[contractevent]
pub struct MilestoneRecorded {
    #[topic]
    pub case_id: u32,
    pub index: u32,
    pub kind: Symbol,
    pub evidence_hash: BytesN<32>,
}

#[contractevent]
pub struct MilestoneValidated {
    #[topic]
    pub case_id: u32,
    pub index: u32,
    pub validator: Address,
}

#[contract]
pub struct RaizSilvestre;

#[contractimpl]
impl RaizSilvestre {
    /// One-time setup. `admin` authorizes rescue organizations; `approvers`
    /// co-sign disbursements (`threshold` approvals required) and validate
    /// milestones. `token` is the SEP-41 asset used for donations.
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        approvers: Vec<Address>,
        threshold: u32,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Config) {
            return Err(Error::AlreadyInitialized);
        }
        if threshold == 0 || threshold > approvers.len() {
            return Err(Error::InvalidThreshold);
        }
        admin.require_auth();
        env.storage().instance().set(
            &DataKey::Config,
            &Config {
                admin,
                token,
                approvers,
                threshold,
            },
        );
        env.storage().instance().set(&DataKey::CaseCount, &0u32);
        env.storage().instance().set(&DataKey::ProposalCount, &0u32);
        bump_instance(&env);
        Ok(())
    }

    /// Admin allow-lists a rescue organization that may open cases.
    pub fn authorize_org(env: Env, org: Address) -> Result<(), Error> {
        let cfg = config(&env)?;
        cfg.admin.require_auth();
        let key = DataKey::Org(org.clone());
        env.storage().persistent().set(&key, &true);
        bump_persistent(&env, &key);
        bump_instance(&env);
        OrgAuthorized { org }.publish(&env);
        Ok(())
    }

    /// An authorized organization opens a case. `meta_hash` commits to the
    /// off-chain case file (budget breakdown, initial assessment); sensitive
    /// details stay off-chain.
    pub fn register_case(
        env: Env,
        org: Address,
        goal: i128,
        meta_hash: BytesN<32>,
    ) -> Result<u32, Error> {
        org.require_auth();
        config(&env)?;
        if goal <= 0 {
            return Err(Error::InvalidAmount);
        }
        let org_key = DataKey::Org(org.clone());
        if !env.storage().persistent().has(&org_key) {
            return Err(Error::OrgNotAuthorized);
        }
        bump_persistent(&env, &org_key);

        let id: u32 = env.storage().instance().get(&DataKey::CaseCount).unwrap_or(0) + 1;
        env.storage().instance().set(&DataKey::CaseCount, &id);
        let case = Case {
            org: org.clone(),
            goal,
            raised: 0,
            disbursed: 0,
            meta_hash: meta_hash.clone(),
            milestone_count: 0,
        };
        save_case(&env, id, &case);
        bump_instance(&env);
        CaseRegistered {
            case_id: id,
            org,
            goal,
            meta_hash,
        }
        .publish(&env);
        Ok(id)
    }

    /// Sponsor funds a case. The tokens move into the contract and are
    /// tracked per case.
    pub fn donate(env: Env, donor: Address, case_id: u32, amount: i128) -> Result<(), Error> {
        donor.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let cfg = config(&env)?;
        let mut case = load_case(&env, case_id)?;
        token::Client::new(&env, &cfg.token).transfer(
            &donor,
            &env.current_contract_address(),
            &amount,
        );
        case.raised += amount;
        save_case(&env, case_id, &case);
        bump_instance(&env);
        Donation {
            case_id,
            donor,
            amount,
        }
        .publish(&env);
        Ok(())
    }

    /// The organization reports an expense it wants paid out. `evidence_hash`
    /// is the hash of the invoice/receipt stored off-chain. Funds stay in the
    /// contract until enough approvers sign.
    pub fn propose_disbursement(
        env: Env,
        case_id: u32,
        amount: i128,
        evidence_hash: BytesN<32>,
    ) -> Result<u32, Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let case = load_case(&env, case_id)?;
        case.org.require_auth();
        if amount > case.raised - case.disbursed {
            return Err(Error::InsufficientFunds);
        }
        let id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0)
            + 1;
        env.storage().instance().set(&DataKey::ProposalCount, &id);
        let proposal = Proposal {
            case_id,
            amount,
            evidence_hash: evidence_hash.clone(),
            approvals: Vec::new(&env),
            status: ProposalStatus::Pending,
        };
        save_proposal(&env, id, &proposal);
        bump_instance(&env);
        DisbursementProposed {
            case_id,
            proposal_id: id,
            amount,
            evidence_hash,
        }
        .publish(&env);
        Ok(id)
    }

    /// An approver co-signs a proposal. When `threshold` distinct approvers
    /// have signed, the payment to the organization is executed.
    pub fn approve_disbursement(
        env: Env,
        approver: Address,
        proposal_id: u32,
    ) -> Result<(), Error> {
        approver.require_auth();
        let cfg = config(&env)?;
        if !cfg.approvers.contains(&approver) {
            return Err(Error::NotApprover);
        }
        let mut proposal = load_proposal(&env, proposal_id)?;
        if proposal.status != ProposalStatus::Pending {
            return Err(Error::ProposalClosed);
        }
        if proposal.approvals.contains(&approver) {
            return Err(Error::AlreadyApproved);
        }
        proposal.approvals.push_back(approver.clone());
        let count = proposal.approvals.len();
        DisbursementApproved {
            proposal_id,
            approver,
            approvals: count,
        }
        .publish(&env);

        if count >= cfg.threshold {
            let mut case = load_case(&env, proposal.case_id)?;
            if proposal.amount > case.raised - case.disbursed {
                return Err(Error::InsufficientFunds);
            }
            case.disbursed += proposal.amount;
            proposal.status = ProposalStatus::Executed;
            token::Client::new(&env, &cfg.token).transfer(
                &env.current_contract_address(),
                &case.org,
                &proposal.amount,
            );
            save_case(&env, proposal.case_id, &case);
            DisbursementExecuted {
                case_id: proposal.case_id,
                proposal_id,
                amount: proposal.amount,
            }
            .publish(&env);
        }
        save_proposal(&env, proposal_id, &proposal);
        bump_instance(&env);
        Ok(())
    }

    /// The organization records a recovery milestone (e.g. `vet_eval`,
    /// `rehab_start`, `release`) with the hash of its off-chain evidence.
    pub fn record_milestone(
        env: Env,
        case_id: u32,
        kind: Symbol,
        evidence_hash: BytesN<32>,
    ) -> Result<u32, Error> {
        let mut case = load_case(&env, case_id)?;
        case.org.require_auth();
        let index = case.milestone_count;
        case.milestone_count += 1;
        let key = DataKey::Milestone(case_id, index);
        env.storage().persistent().set(
            &key,
            &Milestone {
                kind: kind.clone(),
                evidence_hash: evidence_hash.clone(),
                validators: Vec::new(&env),
            },
        );
        bump_persistent(&env, &key);
        save_case(&env, case_id, &case);
        bump_instance(&env);
        MilestoneRecorded {
            case_id,
            index,
            kind,
            evidence_hash,
        }
        .publish(&env);
        Ok(index)
    }

    /// An approver (e.g. a veterinary professional) attests to a milestone.
    /// Milestones with no validators are "reported by the organization" only.
    pub fn validate_milestone(
        env: Env,
        validator: Address,
        case_id: u32,
        index: u32,
    ) -> Result<(), Error> {
        validator.require_auth();
        let cfg = config(&env)?;
        if !cfg.approvers.contains(&validator) {
            return Err(Error::NotApprover);
        }
        let key = DataKey::Milestone(case_id, index);
        let mut milestone: Milestone = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::MilestoneNotFound)?;
        if milestone.validators.contains(&validator) {
            return Err(Error::AlreadyApproved);
        }
        milestone.validators.push_back(validator.clone());
        env.storage().persistent().set(&key, &milestone);
        bump_persistent(&env, &key);
        bump_instance(&env);
        MilestoneValidated {
            case_id,
            index,
            validator,
        }
        .publish(&env);
        Ok(())
    }

    pub fn get_config(env: Env) -> Result<Config, Error> {
        config(&env)
    }

    pub fn is_org_authorized(env: Env, org: Address) -> bool {
        env.storage().persistent().has(&DataKey::Org(org))
    }

    pub fn case_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::CaseCount).unwrap_or(0)
    }

    pub fn get_case(env: Env, case_id: u32) -> Result<Case, Error> {
        load_case(&env, case_id)
    }

    pub fn get_proposal(env: Env, proposal_id: u32) -> Result<Proposal, Error> {
        load_proposal(&env, proposal_id)
    }

    pub fn get_milestone(env: Env, case_id: u32, index: u32) -> Result<Milestone, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Milestone(case_id, index))
            .ok_or(Error::MilestoneNotFound)
    }

    /// Funds held by the contract for a case (raised minus disbursed).
    pub fn case_balance(env: Env, case_id: u32) -> Result<i128, Error> {
        let case = load_case(&env, case_id)?;
        Ok(case.raised - case.disbursed)
    }
}

fn config(env: &Env) -> Result<Config, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Config)
        .ok_or(Error::NotInitialized)
}

fn load_case(env: &Env, id: u32) -> Result<Case, Error> {
    let key = DataKey::Case(id);
    let case = env.storage().persistent().get(&key).ok_or(Error::CaseNotFound)?;
    bump_persistent(env, &key);
    Ok(case)
}

fn save_case(env: &Env, id: u32, case: &Case) {
    let key = DataKey::Case(id);
    env.storage().persistent().set(&key, case);
    bump_persistent(env, &key);
}

fn load_proposal(env: &Env, id: u32) -> Result<Proposal, Error> {
    let key = DataKey::Proposal(id);
    let p = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::ProposalNotFound)?;
    bump_persistent(env, &key);
    Ok(p)
}

fn save_proposal(env: &Env, id: u32, p: &Proposal) {
    let key = DataKey::Proposal(id);
    env.storage().persistent().set(&key, p);
    bump_persistent(env, &key);
}

fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
}

fn bump_persistent(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, TTL_THRESHOLD, TTL_EXTEND_TO);
}
