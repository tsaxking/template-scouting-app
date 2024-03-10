// This file was generated by a script, please do not modify it. If you see any problems, please raise an issue on  https://github.com/tsaxking/webpack-template/issues

export type Accounts = {
    id: string;
    username: string;
    key: string;
    salt: string;
    firstName: string;
    lastName: string;
    email: string;
    passwordChange: string | undefined;
    picture: string | undefined;
    verified: number;
    verification: string | undefined;
    emailChange: string | undefined;
    passwordChangeDate: number | undefined;
    phoneNumber: string | undefined;
    created: number;
};

export type Members = {
    id: string;
    title: string | undefined;
    status: string | undefined;
    bio: string | undefined;
    resume: string | undefined;
    board: number;
};

export type Roles = {
    id: string;
    name: string;
    description: string | undefined;
    rank: number;
};

export type AccountRoles = {
    accountId: string;
    roleId: string;
};

export type Permissions = {
    roleId: string;
    permission: string;
    description: string | undefined;
};

export type Version = {
    major: number;
    minor: number;
    patch: number;
};

export type Sessions = {
    id: string;
    accountId: string | undefined;
    ip: string | undefined;
    userAgent: string | undefined;
    latestActivity: number | undefined;
    requests: number;
    created: number;
    prevUrl: string | undefined;
};

export type Blacklist = {
    id: string;
    ip: string;
    created: number;
    accountId: string | undefined;
    reason: string;
};

export type AccountSettings = {
    accountId: string;
    settings: string;
};

export type Select_permissions_all = undefined;

export type Select_roles_from_name = {
    name: string;
};

export type Delete_roles_delete = {
    id: string;
};

export type Update_roles_update = {
    name: string;
    description: string | undefined;
    rank: number;
    id: string;
};

export type Insert_roles_new = {
    id: string;
    name: string;
    description: string | undefined;
    rank: number;
};

export type Select_roles_from_id = {
    id: string;
};

export type Select_roles_all = undefined;

export type Delete_sessions_delete = {
    id: string;
};

export type Delete_sessions_delete_all = undefined;

export type Update_sessions_update = {
    accountId: string | undefined;
    userAgent: string | undefined;
    latestActivity: number | undefined;
    requests: number;
    ip: string | undefined;
    prevUrl: string | undefined;
    id: string;
};

export type Insert_sessions_new = {
    id: string;
    accountId: string | undefined;
    userAgent: string | undefined;
    latestActivity: number | undefined;
    requests: number;
    created: number;
    ip: string | undefined;
    prevUrl: string | undefined;
    customData: string;
};

export type Select_sessions_get = {
    id: string;
};

export type Select_sessions_all = undefined;

export type Delete_member_delete = {
    id: string;
};

export type Update_member_update_title = {
    title: string | undefined;
    id: string;
};

export type Update_member_update_status = {
    id: string;
    status: string;
};

export type Update_member_update_resume = {
    id: string;
    resume: string | undefined;
};

export type Update_member_remove_from_board = {
    id: string;
};

export type Insert_member_new = {
    id: string;
    status: string;
};

export type Update_member_update_bio = {
    bio: string | undefined;
    id: string;
};

export type Update_member_add_to_board = {
    id: string;
};

export type Select_member_all = undefined;

export type Update_account_unverify = {
    id: string;
};

export type Update_account_set_verification = {
    verification: string | undefined;
    id: string;
};

export type Delete_account_delete = {
    id: string;
};

export type Select_account_unverified = undefined;

export type Update_account_change_password = {
    salt: string;
    passwordChange: string | undefined;
    id: string;
    key: string;
};

export type Insert_account_save_settings = {
    accountId: string;
    settings: string;
};

export type Select_account_from_username = {
    username: string;
};

export type Update_account_update_picture = {
    picture: string | undefined;
    id: string;
};

export type Select_account_from_verification_key = {
    verification: string | undefined;
};

export type Select_account_verified = undefined;

export type Update_account_verify = {
    id: string;
};

export type Select_account_get_settings = {
    accountId: string;
};

export type Update_account_change_email = {
    email: string;
    id: string;
};

export type Delete_account_remove_role = {
    accountId: string;
    roleId: string;
};

export type Insert_account_add_role = {
    accountId: string;
    roleId: string;
};

export type Select_account_from_email = {
    email: string;
};

export type Insert_account_new = {
    id: string;
    username: string;
    key: string;
    salt: string;
    firstName: string;
    lastName: string;
    email: string;
    verified: number;
    verification: string | undefined;
    created: number;
    phoneNumber: string | undefined;
};

export type Update_account_request_password_change = {
    passwordChange: string | undefined;
    id: string;
};

export type Select_account_from_password_change = {
    passwordChange: string | undefined;
};

export type Select_account_from_id = {
    id: string;
};

export type Select_account_all = undefined;

export type Update_account_request_email_change = {
    emailChange: string | undefined;
    id: string;
};

export type Update_account_change_username = {
    username: string;
    id: string;
};

export type Select_db_get_version = undefined;

export type Update_db_change_version = {
    major: number;
    minor: number;
    patch: number;
};

export type Insert_db_init = {
    id: string;
    username: string;
    key: string;
    salt: string;
    firstName: string;
    lastName: string;
    email: string;
    passwordChange: string | undefined;
    picture: string | undefined;
    verified: number;
    verification: string | undefined;
    emailChange: string | undefined;
    passwordChangeDate: number | undefined;
    phoneNumber: string | undefined;
    created: number;
};

export type RolePermissions = {
    roleId: string;
    permission: string;
};

export type ServerRequests = {
    id: string;
    url: string;
    body: string;
    response: string | undefined;
    date: string;
};

export type Insert_server_requests_new = {
    id: string;
    body: string;
    url: string;
    date: string;
};

export type Delete_server_requests_delete = {
    id: string;
};

export type Update_server_requests_update = {
    response: string | undefined;
    id: string;
};

export type Select_server_requests_get = {
    id: string;
};

export type Select_server_requests_all = undefined;

export type Update_sessions_sign_in = {
    accountId: string | undefined;
    id: string;
};

export type Update_sessions_sign_out = {
    id: string;
};

export type Delete_db_delete_version = undefined;

export type Insert_db_change_version = {
    major: number;
    minor: number;
    patch: number;
};

export type Insert_permissions_add_to_role = {
    roleId: string;
    permission: string;
};

export type Delete_permissions_remove_from_role = {
    roleId: string;
    permission: string;
};

export type Select_blacklist_all = undefined;

export type TBARequests = {
    url: string;
    response: string | undefined;
    updated: number;
    update: number;
};

export type Update_db_versions______ = undefined;

export type Select_tba_from_url = {
    url: string;
};

export type Insert_tba_new = {
    url: string;
    response: string | undefined;
    updated: number;
    update: number;
};
