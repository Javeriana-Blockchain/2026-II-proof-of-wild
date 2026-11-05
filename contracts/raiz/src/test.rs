#![cfg(test)]

use super::*;
use soroban_sdk::{
    symbol_short,
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    vec, Address, BytesN, Env,
};

struct Setup<'a> {
    env: Env,
    client: RaizSilvestreClient<'a>,
    token: TokenClient<'a>,
    org: Address,
    donor: Address,
    approvers: [Address; 3],
}

fn hash(env: &Env, b: u8) -> BytesN<32> {
    BytesN::from_array(env, &[b; 32])
}

fn setup<'a>() -> Setup<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let org = Address::generate(&env);
    let donor = Address::generate(&env);
    let approvers = [
        Address::generate(&env),
        Address::generate(&env),
        Address::generate(&env),
    ];

    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    StellarAssetClient::new(&env, &sac.address()).mint(&donor, &10_000);
    let token = TokenClient::new(&env, &sac.address());

    let id = env.register(RaizSilvestre, ());
    let client = RaizSilvestreClient::new(&env, &id);
    client.initialize(
        &admin,
        &sac.address(),
        &vec![&env, approvers[0].clone(), approvers[1].clone(), approvers[2].clone()],
        &2,
    );
    client.authorize_org(&org);

    Setup {
        env,
        client,
        token,
        org,
        donor,
        approvers,
    }
}

#[test]
fn full_flow_donate_propose_approve_pay() {
    let s = setup();
    let case_id = s.client.register_case(&s.org, &1_000, &hash(&s.env, 1));
    assert_eq!(case_id, 1);

    s.client.donate(&s.donor, &case_id, &800);
    assert_eq!(s.client.case_balance(&case_id), 800);
    assert_eq!(s.token.balance(&s.donor), 9_200);

    let p = s.client.propose_disbursement(&case_id, &350, &hash(&s.env, 2));

    // First approval does not pay yet.
    s.client.approve_disbursement(&s.approvers[0], &p);
    assert_eq!(s.token.balance(&s.org), 0);
    assert_eq!(s.client.get_case(&case_id).disbursed, 0);

    // Second approval reaches the threshold and pays the organization.
    s.client.approve_disbursement(&s.approvers[1], &p);
    assert_eq!(s.token.balance(&s.org), 350);
    assert_eq!(s.client.get_case(&case_id).disbursed, 350);
    assert_eq!(s.client.case_balance(&case_id), 450);
    assert_eq!(s.client.get_proposal(&p).status, ProposalStatus::Executed);
}

#[test]
fn milestone_reported_then_validated() {
    let s = setup();
    let case_id = s.client.register_case(&s.org, &1_000, &hash(&s.env, 1));
    let i = s
        .client
        .record_milestone(&case_id, &symbol_short!("vet_eval"), &hash(&s.env, 3));
    assert_eq!(i, 0);
    assert_eq!(s.client.get_milestone(&case_id, &i).validators.len(), 0);

    s.client.validate_milestone(&s.approvers[2], &case_id, &i);
    let m = s.client.get_milestone(&case_id, &i);
    assert_eq!(m.validators.len(), 1);
    assert_eq!(m.validators.get(0).unwrap(), s.approvers[2]);
}

#[test]
fn cannot_initialize_twice() {
    let s = setup();
    let cfg = s.client.get_config();
    let r = s
        .client
        .try_initialize(&cfg.admin, &cfg.token, &cfg.approvers, &cfg.threshold);
    assert_eq!(r, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn invalid_threshold_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let id = env.register(RaizSilvestre, ());
    let client = RaizSilvestreClient::new(&env, &id);
    let a = Address::generate(&env);
    assert_eq!(
        client.try_initialize(&admin, &token, &vec![&env, a.clone()], &0),
        Err(Ok(Error::InvalidThreshold))
    );
    assert_eq!(
        client.try_initialize(&admin, &token, &vec![&env, a], &2),
        Err(Ok(Error::InvalidThreshold))
    );
}

#[test]
fn unauthorized_org_cannot_register() {
    let s = setup();
    let stranger = Address::generate(&s.env);
    let r = s.client.try_register_case(&stranger, &1_000, &hash(&s.env, 1));
    assert_eq!(r, Err(Ok(Error::OrgNotAuthorized)));
}

#[test]
fn rejects_non_positive_amounts() {
    let s = setup();
    assert_eq!(
        s.client.try_register_case(&s.org, &0, &hash(&s.env, 1)),
        Err(Ok(Error::InvalidAmount))
    );
    let case_id = s.client.register_case(&s.org, &1_000, &hash(&s.env, 1));
    assert_eq!(
        s.client.try_donate(&s.donor, &case_id, &0),
        Err(Ok(Error::InvalidAmount))
    );
    assert_eq!(
        s.client.try_propose_disbursement(&case_id, &-5, &hash(&s.env, 2)),
        Err(Ok(Error::InvalidAmount))
    );
}

#[test]
fn cannot_propose_more_than_balance() {
    let s = setup();
    let case_id = s.client.register_case(&s.org, &1_000, &hash(&s.env, 1));
    s.client.donate(&s.donor, &case_id, &100);
    assert_eq!(
        s.client.try_propose_disbursement(&case_id, &101, &hash(&s.env, 2)),
        Err(Ok(Error::InsufficientFunds))
    );
}

#[test]
fn non_approver_and_double_approval_rejected() {
    let s = setup();
    let case_id = s.client.register_case(&s.org, &1_000, &hash(&s.env, 1));
    s.client.donate(&s.donor, &case_id, &500);
    let p = s.client.propose_disbursement(&case_id, &100, &hash(&s.env, 2));

    let stranger = Address::generate(&s.env);
    assert_eq!(
        s.client.try_approve_disbursement(&stranger, &p),
        Err(Ok(Error::NotApprover))
    );

    s.client.approve_disbursement(&s.approvers[0], &p);
    assert_eq!(
        s.client.try_approve_disbursement(&s.approvers[0], &p),
        Err(Ok(Error::AlreadyApproved))
    );
}

#[test]
fn executed_proposal_cannot_be_approved_again() {
    let s = setup();
    let case_id = s.client.register_case(&s.org, &1_000, &hash(&s.env, 1));
    s.client.donate(&s.donor, &case_id, &500);
    let p = s.client.propose_disbursement(&case_id, &100, &hash(&s.env, 2));
    s.client.approve_disbursement(&s.approvers[0], &p);
    s.client.approve_disbursement(&s.approvers[1], &p);
    assert_eq!(
        s.client.try_approve_disbursement(&s.approvers[2], &p),
        Err(Ok(Error::ProposalClosed))
    );
}

#[test]
fn competing_proposals_cannot_overdraw_the_case() {
    let s = setup();
    let case_id = s.client.register_case(&s.org, &1_000, &hash(&s.env, 1));
    s.client.donate(&s.donor, &case_id, &100);
    // Both fit individually, but not together.
    let p1 = s.client.propose_disbursement(&case_id, &80, &hash(&s.env, 2));
    let p2 = s.client.propose_disbursement(&case_id, &80, &hash(&s.env, 3));

    s.client.approve_disbursement(&s.approvers[0], &p1);
    s.client.approve_disbursement(&s.approvers[1], &p1);

    s.client.approve_disbursement(&s.approvers[0], &p2);
    assert_eq!(
        s.client.try_approve_disbursement(&s.approvers[1], &p2),
        Err(Ok(Error::InsufficientFunds))
    );
    assert_eq!(s.token.balance(&s.org), 80);
}

#[test]
fn unknown_ids_return_errors() {
    let s = setup();
    assert_eq!(s.client.try_get_case(&99), Err(Ok(Error::CaseNotFound)));
    assert_eq!(s.client.try_get_proposal(&99), Err(Ok(Error::ProposalNotFound)));
    assert_eq!(
        s.client.try_donate(&s.donor, &99, &10),
        Err(Ok(Error::CaseNotFound))
    );
}
