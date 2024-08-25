INSERT INTO AccountNotifications (
    id,
    accountId,
    type,
    data,
    message,
    created
) VALUES (
    :id,
    :accountId,
    :type,
    :data,
    :message,
    :created
);