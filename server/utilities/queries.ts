// This file was generated by a script, please do not modify it. If you see any problems, please raise an issue on  https://github.com/tsaxking/webpack-template/issues

import { Accounts } from './tables';
import { Members } from './tables';
import { Roles } from './tables';
import { AccountRoles } from './tables';
import { Permissions } from './tables';
import { Version } from './tables';
import { Sessions } from './tables';
import { Blacklist } from './tables';
import { AccountSettings } from './tables';
import { Select_permissions_all } from './tables';
import { Select_roles_from_name } from './tables';
import { Delete_roles_delete } from './tables';
import { Update_roles_update } from './tables';
import { Insert_roles_new } from './tables';
import { Select_roles_from_id } from './tables';
import { Select_roles_all } from './tables';
import { Delete_sessions_delete } from './tables';
import { Delete_sessions_delete_all } from './tables';
import { Update_sessions_update } from './tables';
import { Insert_sessions_new } from './tables';
import { Select_sessions_get } from './tables';
import { Select_sessions_all } from './tables';
import { Delete_member_delete } from './tables';
import { Update_member_update_title } from './tables';
import { Update_member_update_status } from './tables';
import { Update_member_update_resume } from './tables';
import { Update_member_remove_from_board } from './tables';
import { Insert_member_new } from './tables';
import { Update_member_update_bio } from './tables';
import { Update_member_add_to_board } from './tables';
import { Select_member_all } from './tables';
import { Update_account_unverify } from './tables';
import { Update_account_set_verification } from './tables';
import { Delete_account_delete } from './tables';
import { Select_account_unverified } from './tables';
import { Update_account_change_password } from './tables';
import { Insert_account_save_settings } from './tables';
import { Select_account_from_username } from './tables';
import { Update_account_update_picture } from './tables';
import { Select_account_from_verification_key } from './tables';
import { Select_account_verified } from './tables';
import { Update_account_verify } from './tables';
import { Select_account_get_settings } from './tables';
import { Update_account_change_email } from './tables';
import { Delete_account_remove_role } from './tables';
import { Insert_account_add_role } from './tables';
import { Select_account_from_email } from './tables';
import { Insert_account_new } from './tables';
import { Update_account_request_password_change } from './tables';
import { Select_account_from_password_change } from './tables';
import { Select_account_from_id } from './tables';
import { Select_account_all } from './tables';
import { Update_account_request_email_change } from './tables';
import { Update_account_change_username } from './tables';
import { Select_db_get_version } from './tables';
import { Update_db_change_version } from './tables';
import { Insert_db_init } from './tables';
import { RolePermissions } from './tables';
import { Insert_permissions_add_to_role } from './tables';
import { Delete_permissions_remove_from_role } from './tables';
import { Select_blacklist_all } from './tables';
import { Update_sessions_sign_in } from './tables';
import { Update_sessions_sign_out } from './tables';
import { Insert_db_change_version } from './tables';
import { Delete_db_delete_version } from './tables';

export type Queries = {
    'permissions/all': [[Select_permissions_all], Permissions];
    'permissions/from-role': [[{ roleId: string }], Permissions];
    'permissions/remove-from-role': [
        [Delete_permissions_remove_from_role],
        unknown
    ];
    'permissions/add-to-role': [[Insert_permissions_add_to_role], unknown];
    'roles/from-name': [[Select_roles_from_name], Roles];
    'roles/delete': [[Delete_roles_delete], unknown];
    'roles/update': [[Update_roles_update], unknown];
    'roles/new': [[Insert_roles_new], unknown];
    'roles/from-id': [[Select_roles_from_id], Roles];
    'roles/all': [[Select_roles_all], Roles];
    'roles/from-username': [[{ username: string }], Roles];
    'sessions/delete': [[Delete_sessions_delete], unknown];
    'sessions/delete-all': [[Delete_sessions_delete_all], unknown];
    'sessions/update': [[Update_sessions_update], unknown];
    'sessions/new': [[Insert_sessions_new], unknown];
    'sessions/get': [[Select_sessions_get], Sessions];
    'sessions/all': [[Select_sessions_all], Sessions];
    'sessions/sign-in': [[Update_sessions_sign_in], unknown];
    'sessions/sign-out': [[Update_sessions_sign_out], unknown];
    'member/delete': [[Delete_member_delete], unknown];
    'member/update-title': [[Update_member_update_title], unknown];
    'member/update-status': [[Update_member_update_status], unknown];
    'member/update-resume': [[Update_member_update_resume], unknown];
    'member/remove-from-board': [[Update_member_remove_from_board], unknown];
    'member/new': [[Insert_member_new], unknown];
    'member/update-bio': [[Update_member_update_bio], unknown];
    'member/add-to-board': [[Update_member_add_to_board], unknown];
    'member/all': [[Select_member_all], Members];
    'member/from-username': [[{ username: string }], Members];
    'account/unverify': [[Update_account_unverify], unknown];
    'account/set-verification': [[Update_account_set_verification], unknown];
    'account/delete': [[Delete_account_delete], unknown];
    'account/unverified': [[Select_account_unverified], Accounts];
    'account/change-password': [[Update_account_change_password], unknown];
    'account/save-settings': [[Insert_account_save_settings], unknown];
    'account/from-username': [[Select_account_from_username], Accounts];
    'account/update-picture': [[Update_account_update_picture], unknown];
    'account/from-verification-key': [
        [Select_account_from_verification_key],
        Accounts
    ];
    'account/verified': [[Select_account_verified], Accounts];
    'account/verify': [[Update_account_verify], unknown];
    'account/get-settings': [[Select_account_get_settings], AccountSettings];
    'account/change-email': [[Update_account_change_email], unknown];
    'account/remove-role': [[Delete_account_remove_role], unknown];
    'account/add-role': [[Insert_account_add_role], unknown];
    'account/from-email': [[Select_account_from_email], Accounts];
    'account/new': [[Insert_account_new], unknown];
    'account/request-password-change': [
        [Update_account_request_password_change],
        unknown
    ];
    'account/from-password-change': [
        [Select_account_from_password_change],
        Accounts
    ];
    'account/from-id': [[Select_account_from_id], Accounts];
    'account/all': [[Select_account_all], Accounts];
    'account/request-email-change': [
        [Update_account_request_email_change],
        unknown
    ];
    'account/change-username': [[Update_account_change_username], unknown];
    'account/roles': [[{ id: string }], Roles];
    'db/get-version': [[Select_db_get_version], Version];
    'db/change-version': [[Insert_db_change_version], unknown];
    'db/delete-version': [[Delete_db_delete_version], unknown];
    'db/init': [[Insert_db_init], unknown];
    'blacklist/all': [[Select_blacklist_all], Blacklist];
    'blacklist/new': [
        [
            {
                id: string;
                ip: string;
                created: number;
                accountId: string | undefined;
                reason: string;
            }
        ],
        unknown
    ];
    'blacklist/delete': [
        [
            {
                id: string;
            }
        ],
        unknown
    ];
    'blacklist/from-account': [
        [
            {
                accountId: string;
            }
        ],
        Blacklist
    ];
    'blacklist/from-ip': [
        [
            {
                ip: string;
            }
        ],
        Blacklist
    ];
    'blacklist/delete-by-ip': [
        [
            {
                ip: string;
            }
        ]
    ];
    'blacklist/delete-by-account': [
        [
            {
                accountId: string;
            }
        ]
    ];
    'server-requests/all': [
        [],
        {
            id: string;
            url: string;
            body: string;
            response: string | undefined;
            date: number;
        }
    ];
    'server-requests/new': [
        [
            {
                id: string;
                url: string;
                body: string;
                date: number;
            }
        ],
        {
            id: string;
            url: string;
            body: string;
            date: number;
            response: string | undefined;
        }
    ];
    'server-requests/update': [
        [
            {
                id: string;
                response: string;
            }
        ],
        unknown
    ];
    'tba/from-url': [
        [
            {
                url: string;
            }
        ],
        {
            url: string;
            response: string | undefined;
            updated: number;
            update: 0 | 1;
        }
    ];
    'tba/new': [
        [
            {
                url: string;
                response: string;
                updated: number;
                update: 0 | 1;
            }
        ],
        unknown
    ];
};
