CREATE TABLE `cases` (
	`id` text PRIMARY KEY NOT NULL,
	`share_token` text NOT NULL,
	`insurance_line` text NOT NULL,
	`providers` text DEFAULT '[]' NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`label` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`submitted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cases_share_token_unique` ON `cases` (`share_token`);