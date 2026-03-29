import Map "mo:core/Map";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Array "mo:core/Array";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Authorization "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  let accessControlState = Authorization.initState();
  include MixinAuthorization(accessControlState);

  // ------ Types ------

  public type UserId = Principal;

  public type UserProfile = {
    name : Text;
    email : Text;
    role : Text; // "Admin" or "SalesRep"
  };

  public type Lead = {
    parentName : Text;
    phone : Text;
    childName : Text;
    age : Nat;
    branch : Text;
    interest : Text;
    score : Nat;
    status : LeadStatus;
    source : Text;
    assignedTo : ?UserId;
    createdAt : Int;
    updatedAt : Int;
  };

  public type LeadStatus = {
    #New;
    #Contacted;
    #VisitBooked;
    #Converted;
    #Dropped;
  };

  public type ActivityType = {
    #StatusChange;
    #NoteAdded;
    #FollowUpScheduled;
    #FollowUpDone;
  };

  public type Activity = {
    leadId : Nat;
    activityType : ActivityType;
    description : Text;
    actorId : UserId;
    createdAt : Int;
  };

  public type FollowUp = {
    leadId : Nat;
    dueDate : Int;
    message : Text;
    isDone : Bool;
    createdAt : Int;
  };

  public type Branch = {
    name : Text;
    createdAt : Int;
  };

  public type Note = {
    leadId : Nat;
    content : Text;
    authorId : UserId;
    createdAt : Int;
  };

  public type CreateLeadInput = {
    parentName : Text;
    phone : Text;
    childName : Text;
    age : Nat;
    branch : Text;
    interest : Text;
    score : Nat;
    status : LeadStatus;
    source : Text;
    assignedTo : ?UserId;
  };

  public type UpdateLeadInput = {
    parentName : ?Text;
    phone : ?Text;
    childName : ?Text;
    age : ?Nat;
    branch : ?Text;
    interest : ?Text;
    score : ?Nat;
    status : ?LeadStatus;
    source : ?Text;
    assignedTo : ?(?UserId);
  };

  public type DashboardStats = {
    totalLeads : Nat;
    convertedCount : Nat;
    hotLeadsCount : Nat;
    pendingFollowUpsCount : Nat;
  };

  // ------ Helper Modules ------

  module Lead {
    public func compare(lead1 : Lead, lead2 : Lead) : Order.Order {
      Text.compare(lead1.parentName, lead2.parentName);
    };
  };

  module Note {
    public func compare(note1 : Note, note2 : Note) : Order.Order {
      Int.compare(note1.createdAt, note2.createdAt);
    };
  };

  module Activity {
    public func compare(activity1 : Activity, activity2 : Activity) : Order.Order {
      Int.compare(activity1.createdAt, activity2.createdAt);
    };
  };

  module FollowUp {
    public func compare(fu1 : FollowUp, fu2 : FollowUp) : Order.Order {
      Int.compare(fu1.dueDate, fu2.dueDate);
    };
  };

  module Branch {
    public func compare(branch1 : Branch, branch2 : Branch) : Order.Order {
      Int.compare(branch1.createdAt, branch2.createdAt);
    };
  };

  // ------ Persistent State ------

  var nextLeadId = 1;
  var nextNoteId = 1;
  var nextActivityId = 1;
  var nextFollowUpId = 1;
  var nextBranchId = 1;

  let leads = Map.empty<Nat, Lead>();
  let notes = Map.empty<Nat, Note>();
  let activities = Map.empty<Nat, Activity>();
  let followUps = Map.empty<Nat, FollowUp>();
  let branches = Map.empty<Nat, Branch>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // ------ User Profile Management ------

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    if (caller != user and not Authorization.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // ------ Helper Functions ------

  func createActivityHelper(input : {
    leadId : Nat;
    activityType : ActivityType;
    description : Text;
    actorId : UserId;
  }) {
    let activityId = nextActivityId;
    let activity : Activity = {
      leadId = input.leadId;
      activityType = input.activityType;
      description = input.description;
      actorId = input.actorId;
      createdAt = Time.now();
    };
    activities.add(activityId, activity);
    nextActivityId += 1;
  };

  func canAccessLead(caller : Principal, lead : Lead) : Bool {
    if (Authorization.isAdmin(accessControlState, caller)) {
      return true;
    };
    switch (lead.assignedTo) {
      case (?assignedUser) {
        Principal.equal(caller, assignedUser);
      };
      case null {
        true; // Unassigned leads can be accessed by any user
      };
    };
  };

  // ------ Lead CRUD ------

  public shared ({ caller }) func createLead(input : CreateLeadInput) : async Nat {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create leads");
    };
    if (input.parentName == "" or input.childName == "" or input.phone == "") {
      Runtime.trap("Parent name, child name, and phone are required");
    };
    let leadId = nextLeadId;
    let now = Time.now();
    let lead : Lead = {
      parentName = input.parentName;
      phone = input.phone;
      childName = input.childName;
      age = input.age;
      branch = input.branch;
      interest = input.interest;
      score = input.score;
      status = input.status;
      source = input.source;
      assignedTo = input.assignedTo;
      createdAt = now;
      updatedAt = now;
    };
    leads.add(leadId, lead);
    nextLeadId += 1;
    createActivityHelper({
      leadId;
      activityType = #StatusChange;
      description = "Lead created with status New";
      actorId = caller;
    });
    leadId;
  };

  public shared ({ caller }) func updateLead(leadId : Nat, input : UpdateLeadInput) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update leads");
    };
    switch (leads.get(leadId)) {
      case null {
        Runtime.trap("Lead does not exist");
      };
      case (?existingLead) {
        if (not canAccessLead(caller, existingLead)) {
          Runtime.trap("Unauthorized: You can only update leads assigned to you");
        };
        let now = Time.now();
        let oldStatus = existingLead.status;
        let updatedLead : Lead = {
          parentName = switch (input.parentName) { case (?v) v; case null existingLead.parentName };
          phone = switch (input.phone) { case (?v) v; case null existingLead.phone };
          childName = switch (input.childName) { case (?v) v; case null existingLead.childName };
          age = switch (input.age) { case (?v) v; case null existingLead.age };
          branch = switch (input.branch) { case (?v) v; case null existingLead.branch };
          interest = switch (input.interest) { case (?v) v; case null existingLead.interest };
          score = switch (input.score) { case (?v) v; case null existingLead.score };
          status = switch (input.status) { case (?v) v; case null existingLead.status };
          source = switch (input.source) { case (?v) v; case null existingLead.source };
          assignedTo = switch (input.assignedTo) { case (?v) v; case null existingLead.assignedTo };
          createdAt = existingLead.createdAt;
          updatedAt = now;
        };
        leads.add(leadId, updatedLead);

        // Create activity if status changed
        switch (input.status) {
          case (?newStatus) {
            if (newStatus != oldStatus) {
              createActivityHelper({
                leadId;
                activityType = #StatusChange;
                description = "Status changed from " # debug_show(oldStatus) # " to " # debug_show(newStatus);
                actorId = caller;
              });
            };
          };
          case null {};
        };
      };
    };
  };

  public shared ({ caller }) func deleteLead(leadId : Nat) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete leads");
    };
    if (not leads.containsKey(leadId)) {
      Runtime.trap("Lead does not exist");
    };
    leads.remove(leadId);
  };

  public query ({ caller }) func getLead(leadId : Nat) : async ?Lead {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view leads");
    };
    switch (leads.get(leadId)) {
      case null { null };
      case (?lead) {
        if (canAccessLead(caller, lead)) {
          ?lead;
        } else {
          Runtime.trap("Unauthorized: You can only view leads assigned to you");
        };
      };
    };
  };

  public query ({ caller }) func getAllLeads() : async [Lead] {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view leads");
    };
    let isAdmin = Authorization.isAdmin(accessControlState, caller);
    let allLeads = leads.values().toArray();
    if (isAdmin) {
      allLeads;
    } else {
      allLeads.filter<Lead>(func(lead) { canAccessLead(caller, lead) });
    };
  };

  public query ({ caller }) func getLeadsByStatus(status : LeadStatus) : async [Lead] {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view leads");
    };
    let isAdmin = Authorization.isAdmin(accessControlState, caller);
    let filtered = leads.values().toArray().filter(
      func(lead) { lead.status == status }
    );
    if (isAdmin) {
      filtered;
    } else {
      filtered.filter<Lead>(func(lead) { canAccessLead(caller, lead) });
    };
  };

  public query ({ caller }) func getLeadsByBranch(branch : Text) : async [Lead] {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view leads");
    };
    let isAdmin = Authorization.isAdmin(accessControlState, caller);
    let filtered = leads.values().toArray().filter(
      func(lead) { Text.equal(lead.branch, branch) }
    );
    if (isAdmin) {
      filtered;
    } else {
      filtered.filter<Lead>(func(lead) { canAccessLead(caller, lead) });
    };
  };

  public query ({ caller }) func searchLeads(searchTerm : Text) : async [Lead] {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search leads");
    };
    let isAdmin = Authorization.isAdmin(accessControlState, caller);
    let lowerSearch = searchTerm.toLower();
    let filtered = leads.values().toArray().filter(
      func(lead) {
        lead.parentName.toLower().contains(#text lowerSearch) or
        lead.childName.toLower().contains(#text lowerSearch)
      }
    );
    if (isAdmin) {
      filtered;
    } else {
      filtered.filter<Lead>(func(lead) { canAccessLead(caller, lead) });
    };
  };

  public query ({ caller }) func getDashboardStats() : async DashboardStats {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view dashboard stats");
    };
    let isAdmin = Authorization.isAdmin(accessControlState, caller);
    let allLeads = leads.values().toArray();
    let accessibleLeads = if (isAdmin) {
      allLeads;
    } else {
      allLeads.filter(func(lead) { canAccessLead(caller, lead) });
    };

    let totalLeads = accessibleLeads.size();
    let convertedCount = accessibleLeads.filter(func(lead) {
      lead.status == #Converted
    }).size();
    let hotLeadsCount = accessibleLeads.filter(func(lead) {
      lead.score >= 70
    }).size();

    let allFollowUps = followUps.values().toArray();
    let pendingFollowUpsCount = allFollowUps.filter(func(fu) {
      not fu.isDone and (isAdmin or (switch (leads.get(fu.leadId)) {
        case (?lead) { canAccessLead(caller, lead) };
        case null { false };
      }))
    }).size();

    {
      totalLeads;
      convertedCount;
      hotLeadsCount;
      pendingFollowUpsCount;
    };
  };

  // ------ Note CRUD ------

  public shared ({ caller }) func addNote(leadId : Nat, content : Text) : async Nat {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add notes");
    };
    if (content.trim(#text " ") == "") {
      Runtime.trap("Content cannot be empty");
    };
    switch (leads.get(leadId)) {
      case null {
        Runtime.trap("Lead does not exist");
      };
      case (?lead) {
        if (not canAccessLead(caller, lead)) {
          Runtime.trap("Unauthorized: You can only add notes to leads assigned to you");
        };
        let noteId = nextNoteId;
        let note : Note = {
          leadId;
          content;
          authorId = caller;
          createdAt = Time.now();
        };
        notes.add(noteId, note);
        nextNoteId += 1;
        createActivityHelper({
          leadId;
          activityType = #NoteAdded;
          description = "New note added";
          actorId = caller;
        });
        noteId;
      };
    };
  };

  public query ({ caller }) func getNotesByLead(leadId : Nat) : async [Note] {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notes");
    };
    switch (leads.get(leadId)) {
      case null {
        Runtime.trap("Lead does not exist");
      };
      case (?lead) {
        if (not canAccessLead(caller, lead)) {
          Runtime.trap("Unauthorized: You can only view notes for leads assigned to you");
        };
        notes.values().toArray().filter<Note>(
          func(note) { note.leadId == leadId }
        );
      };
    };
  };

  public shared ({ caller }) func deleteNote(noteId : Nat) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete notes");
    };
    switch (notes.get(noteId)) {
      case null {
        Runtime.trap("Note does not exist");
      };
      case (?note) {
        let isAdmin = Authorization.isAdmin(accessControlState, caller);
        if (not isAdmin and not Principal.equal(caller, note.authorId)) {
          Runtime.trap("Unauthorized: You can only delete your own notes");
        };
        notes.remove(noteId);
      };
    };
  };

  // ------ Activity Queries ------

  public query ({ caller }) func getActivitiesByLead(leadId : Nat) : async [Activity] {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view activities");
    };
    switch (leads.get(leadId)) {
      case null {
        Runtime.trap("Lead does not exist");
      };
      case (?lead) {
        if (not canAccessLead(caller, lead)) {
          Runtime.trap("Unauthorized: You can only view activities for leads assigned to you");
        };
        activities.values().toArray().filter<Activity>(
          func(activity) { activity.leadId == leadId }
        );
      };
    };
  };

  // ------ FollowUp CRUD ------

  public shared ({ caller }) func createFollowUp(leadId : Nat, dueDate : Int, message : Text) : async Nat {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create follow-ups");
    };
    if (message.trim(#text " ") == "") {
      Runtime.trap("Message cannot be empty");
    };
    switch (leads.get(leadId)) {
      case null {
        Runtime.trap("Lead does not exist");
      };
      case (?lead) {
        if (not canAccessLead(caller, lead)) {
          Runtime.trap("Unauthorized: You can only create follow-ups for leads assigned to you");
        };
        let followUpId = nextFollowUpId;
        let followUp : FollowUp = {
          leadId;
          dueDate;
          message;
          isDone = false;
          createdAt = Time.now();
        };
        followUps.add(followUpId, followUp);
        nextFollowUpId += 1;
        createActivityHelper({
          leadId;
          activityType = #FollowUpScheduled;
          description = "Follow-up scheduled";
          actorId = caller;
        });
        followUpId;
      };
    };
  };

  public shared ({ caller }) func markFollowUpDone(followUpId : Nat) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark follow-ups as done");
    };
    switch (followUps.get(followUpId)) {
      case null {
        Runtime.trap("Follow-up does not exist");
      };
      case (?followUp) {
        switch (leads.get(followUp.leadId)) {
          case null {
            Runtime.trap("Associated lead does not exist");
          };
          case (?lead) {
            if (not canAccessLead(caller, lead)) {
              Runtime.trap("Unauthorized: You can only mark follow-ups as done for leads assigned to you");
            };
            let updatedFollowUp : FollowUp = {
              followUp with isDone = true;
            };
            followUps.add(followUpId, updatedFollowUp);
            createActivityHelper({
              leadId = followUp.leadId;
              activityType = #FollowUpDone;
              description = "Follow-up completed";
              actorId = caller;
            });
          };
        };
      };
    };
  };

  public shared ({ caller }) func deleteFollowUp(followUpId : Nat) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete follow-ups");
    };
    switch (followUps.get(followUpId)) {
      case null {
        Runtime.trap("Follow-up does not exist");
      };
      case (?followUp) {
        switch (leads.get(followUp.leadId)) {
          case null {
            Runtime.trap("Associated lead does not exist");
          };
          case (?lead) {
            if (not canAccessLead(caller, lead)) {
              Runtime.trap("Unauthorized: You can only delete follow-ups for leads assigned to you");
            };
            followUps.remove(followUpId);
          };
        };
      };
    };
  };

  public query ({ caller }) func getPendingFollowUps() : async [FollowUp] {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view follow-ups");
    };
    let isAdmin = Authorization.isAdmin(accessControlState, caller);
    followUps.values().toArray().filter<FollowUp>(
      func(fu) {
        not fu.isDone and (isAdmin or (switch (leads.get(fu.leadId)) {
          case (?lead) { canAccessLead(caller, lead) };
          case null { false };
        }))
      }
    );
  };

  public query ({ caller }) func getFollowUpsByLead(leadId : Nat) : async [FollowUp] {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view follow-ups");
    };
    switch (leads.get(leadId)) {
      case null {
        Runtime.trap("Lead does not exist");
      };
      case (?lead) {
        if (not canAccessLead(caller, lead)) {
          Runtime.trap("Unauthorized: You can only view follow-ups for leads assigned to you");
        };
        followUps.values().toArray().filter<FollowUp>(
          func(fu) { fu.leadId == leadId }
        );
      };
    };
  };

  // ------ Branch CRUD ------

  public shared ({ caller }) func createBranch(name : Text) : async Nat {
    if (not (Authorization.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create branches");
    };
    if (name.trim(#text " ") == "") {
      Runtime.trap("Branch name cannot be empty");
    };
    let branchId = nextBranchId;
    let branch : Branch = {
      name;
      createdAt = Time.now();
    };
    branches.add(branchId, branch);
    nextBranchId += 1;
    branchId;
  };

  public shared ({ caller }) func deleteBranch(branchId : Nat) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete branches");
    };
    if (not branches.containsKey(branchId)) {
      Runtime.trap("Branch does not exist");
    };
    branches.remove(branchId);
  };

  public query ({ caller }) func getAllBranches() : async [Branch] {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view branches");
    };
    branches.values().toArray();
  };
};
