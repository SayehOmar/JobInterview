-- Run once if `user_polygons.user_id` was created as VARCHAR (TypeORM default for untyped string columns).
-- Required so it matches `users.id` and `polygon_folders.user_id` (uuid); otherwise combined queries
-- like nextRootSlot() fail with: operator does not exist: character varying = uuid
ALTER TABLE public.user_polygons
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
