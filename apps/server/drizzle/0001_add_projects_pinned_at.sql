ALTER TABLE "project_tasks" ADD COLUMN "milestone_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "pinned_at" timestamp;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_milestone_id_project_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."project_milestones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_tasks_milestoneId_idx" ON "project_tasks" USING btree ("milestone_id");