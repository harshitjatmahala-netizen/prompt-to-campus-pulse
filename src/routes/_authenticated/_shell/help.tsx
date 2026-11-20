import { createFileRoute } from "@tanstack/react-router";
import { Bug, Building2, LifeBuoy, Mail } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Stagger, StaggerItem } from "@/components/app/motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_shell/help")({
  head: () => pageHead("Help Center", "FAQs, college office contact and support for CampusConnect."),
  component: HelpPage,
});

const SUPPORT = "campusconnect@jecrcu.edu.in";
const FAQS: [string, string][] = [
  ["Why can't I sign in with my personal Gmail?", "CampusConnect only accepts official @jecrcu.edu.in Google accounts so that every member is a verified student or staff member."],
  ["How do I change my branch, semester or phone number?", "Open Profile from the menu at the top right. Everything except your verified college email can be edited."],
  ["Who can upload notes and question papers?", "Only faculty and admins. Students can search, preview and download them any time."],
  ["I lost something on campus. What do I do?", "Check Lost & Found. If you see your item, tap Request claim and fill in the details. The college office verifies ownership, then you collect it from the office."],
  ["I found something. Can I post it?", "Please hand it over to the College Office. Admins publish found items so the owner can claim them safely."],
  ["How do I stop some notifications?", "Go to Settings → Notification preferences and switch off the types you don't need."],
  ["Where are my saved items and downloads?", "Use Saved Items and Download History in the sidebar."],
];

function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader icon={<LifeBuoy />} title="Help Center" description="Answers to common questions and ways to reach us." />
      <Stagger className="mb-8 grid gap-4 sm:grid-cols-3">
        <StaggerItem className="rounded-2xl border bg-card p-5 shadow-card interactive-card">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><Building2 className="size-5" /></span>
          <h2 className="mt-4 font-display font-semibold">Contact College Office</h2>
          <p className="mt-1 text-sm text-muted-foreground">For Lost & Found pickups, ID cards and general queries, visit the College Office during working hours.</p>
          <Button asChild variant="outline" size="sm" className="mt-4"><a href={`mailto:${SUPPORT}?subject=College%20Office%20query`}>Email the office</a></Button>
        </StaggerItem>
        <StaggerItem className="rounded-2xl border bg-card p-5 shadow-card interactive-card">
          <span className="flex size-10 items-center justify-center rounded-xl bg-destructive-soft text-destructive"><Bug className="size-5" /></span>
          <h2 className="mt-4 font-display font-semibold">Report a bug</h2>
          <p className="mt-1 text-sm text-muted-foreground">Something not working? Tell us what you tried and what happened.</p>
          <Button asChild variant="outline" size="sm" className="mt-4"><a href={`mailto:${SUPPORT}?subject=Bug%20report&body=What%20I%20was%20doing%3A%0A%0AWhat%20happened%3A%0A`}>Report bug</a></Button>
        </StaggerItem>
        <StaggerItem className="rounded-2xl border bg-card p-5 shadow-card interactive-card">
          <span className="flex size-10 items-center justify-center rounded-xl bg-success-soft text-success"><Mail className="size-5" /></span>
          <h2 className="mt-4 font-display font-semibold">Support email</h2>
          <p className="mt-1 break-all text-sm text-muted-foreground">{SUPPORT}</p>
          <Button asChild size="sm" className="mt-4"><a href={`mailto:${SUPPORT}`}>Write to us</a></Button>
        </StaggerItem>
      </Stagger>
      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold">Frequently asked questions</h2>
        <Accordion type="single" collapsible className="mt-2">
          {FAQS.map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="text-left">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
