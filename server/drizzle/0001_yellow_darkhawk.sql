CREATE TABLE `attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`quiz_id` text NOT NULL,
	`question_id` integer,
	`chosen_answer` integer,
	`correct_answer` integer,
	`is_correct` integer NOT NULL,
	`is_skipped` integer DEFAULT false NOT NULL,
	`track` text NOT NULL,
	`difficulty` text NOT NULL,
	`focus_area` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `attempts_user_idx` ON `attempts` (`user_id`);--> statement-breakpoint
CREATE INDEX `attempts_quiz_idx` ON `attempts` (`quiz_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `attempts_user_quiz_question_unique` ON `attempts` (`user_id`,`quiz_id`,`question_id`);