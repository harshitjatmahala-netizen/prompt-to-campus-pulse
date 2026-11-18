import { createFileRoute } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { ProfileForm } from "@/components/app/profile-form";
import { useMe } from "@/lib/me";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_shell/profile")({
  head: () => pageHead("Profile", "Edit your CampusConnect profile."),
  component: () => {
    const me = useMe();
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader icon={<UserRound />} title="Profile" description="Keep your college details up to date." />
        <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8">{me?.profile && <ProfileForm profile={me.profile} submitLabel="Save changes" />}</div>
      </div>
    );
  },
});
