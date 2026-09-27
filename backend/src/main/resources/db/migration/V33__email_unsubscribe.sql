-- One-click unsubscribe (RFC 8058): the signed API URL sent in the List-Unsubscribe header of each optional email.
ALTER TABLE notification_deliveries ADD COLUMN list_unsubscribe_url VARCHAR(700);
