-- Add kitchen_print_batch_id to order_items to track which items were sent
-- to the kitchen printer in each round. NULL = not yet printed.
alter table order_items
  add column kitchen_print_batch_id uuid default null;
