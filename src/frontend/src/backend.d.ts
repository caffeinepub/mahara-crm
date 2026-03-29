import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Lead {
    age: bigint;
    status: LeadStatus;
    branch: string;
    assignedTo?: UserId;
    interest: string;
    source: string;
    createdAt: bigint;
    score: bigint;
    updatedAt: bigint;
    phone: string;
    childName: string;
    parentName: string;
}
export type UserId = Principal;
export interface Activity {
    activityType: ActivityType;
    createdAt: bigint;
    description: string;
    actorId: UserId;
    leadId: bigint;
}
export interface CreateLeadInput {
    age: bigint;
    status: LeadStatus;
    branch: string;
    assignedTo?: UserId;
    interest: string;
    source: string;
    score: bigint;
    phone: string;
    childName: string;
    parentName: string;
}
export interface UpdateLeadInput {
    age?: bigint;
    status?: LeadStatus;
    branch?: string;
    assignedTo?: UserId | null;
    interest?: string;
    source?: string;
    score?: bigint;
    phone?: string;
    childName?: string;
    parentName?: string;
}
export interface FollowUp {
    createdAt: bigint;
    dueDate: bigint;
    isDone: boolean;
    leadId: bigint;
    message: string;
}
export interface Branch {
    name: string;
    createdAt: bigint;
}
export interface DashboardStats {
    convertedCount: bigint;
    hotLeadsCount: bigint;
    totalLeads: bigint;
    pendingFollowUpsCount: bigint;
}
export interface UserProfile {
    name: string;
    role: string;
    email: string;
}
export interface Note {
    content: string;
    authorId: UserId;
    createdAt: bigint;
    leadId: bigint;
}
export enum ActivityType {
    FollowUpScheduled = "FollowUpScheduled",
    FollowUpDone = "FollowUpDone",
    StatusChange = "StatusChange",
    NoteAdded = "NoteAdded"
}
export enum LeadStatus {
    New = "New",
    Contacted = "Contacted",
    Converted = "Converted",
    VisitBooked = "VisitBooked",
    Dropped = "Dropped"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addNote(leadId: bigint, content: string): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createBranch(name: string): Promise<bigint>;
    createFollowUp(leadId: bigint, dueDate: bigint, message: string): Promise<bigint>;
    createLead(input: CreateLeadInput): Promise<bigint>;
    deleteBranch(branchId: bigint): Promise<void>;
    deleteFollowUp(followUpId: bigint): Promise<void>;
    deleteLead(leadId: bigint): Promise<void>;
    deleteNote(noteId: bigint): Promise<void>;
    getActivitiesByLead(leadId: bigint): Promise<Array<Activity>>;
    getAllBranches(): Promise<Array<Branch>>;
    getAllLeads(): Promise<Array<Lead>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDashboardStats(): Promise<DashboardStats>;
    getFollowUpsByLead(leadId: bigint): Promise<Array<FollowUp>>;
    getLead(leadId: bigint): Promise<Lead | null>;
    getLeadsByBranch(branch: string): Promise<Array<Lead>>;
    getLeadsByStatus(status: LeadStatus): Promise<Array<Lead>>;
    getNotesByLead(leadId: bigint): Promise<Array<Note>>;
    getPendingFollowUps(): Promise<Array<FollowUp>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    markFollowUpDone(followUpId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchLeads(searchTerm: string): Promise<Array<Lead>>;
    updateLead(leadId: bigint, input: UpdateLeadInput): Promise<void>;
}
