use soroban_sdk::{contracterror, contracttype, Address, BytesN, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Config,
    CaseCount,
    ProposalCount,
    Org(Address),
    Case(u32),
    Proposal(u32),
    Milestone(u32, u32),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub admin: Address,
    pub token: Address,
    pub approvers: Vec<Address>,
    pub threshold: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Case {
    pub org: Address,
    pub goal: i128,
    pub raised: i128,
    pub disbursed: i128,
    pub meta_hash: BytesN<32>,
    pub milestone_count: u32,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ProposalStatus {
    Pending,
    Executed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Proposal {
    pub case_id: u32,
    pub amount: i128,
    pub evidence_hash: BytesN<32>,
    pub approvals: Vec<Address>,
    pub status: ProposalStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Milestone {
    pub kind: Symbol,
    pub evidence_hash: BytesN<32>,
    pub validators: Vec<Address>,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidThreshold = 3,
    InvalidAmount = 4,
    OrgNotAuthorized = 5,
    CaseNotFound = 6,
    ProposalNotFound = 7,
    MilestoneNotFound = 8,
    InsufficientFunds = 9,
    NotApprover = 10,
    AlreadyApproved = 11,
    ProposalClosed = 12,
}
