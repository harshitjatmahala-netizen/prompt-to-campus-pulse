import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarDays, ClipboardList, FileStack, FileText, Megaphone, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo, LogoMark } from "@/components/app/logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusConnect — Your university, in one place" },
      { name: "description", content: "Notices, notes, assignments, papers, events and Lost & Found for JECRC University students and faculty." },
      { property: "og:title", content: "CampusConnect — Your university, in one place" },
      { property: "og:description", content: "The official portal for notices, notes, assignments, papers, events and Lost & Found." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const ease = [0.22, 1, 0.36, 1] as const;

const FEATURES = [
  { icon: Megaphone, t: "Digital Notice Board", d: "Official updates, instantly." },
  { icon: FileText, t: "Notes Sharing", d: "Subject-wise study material." },
  { icon: ClipboardList, t: "Assignment Tracker", d: "Never miss a deadline." },
  { icon: FileStack, t: "Previous Year Papers", d: "Prepare smarter for exams." },
  { icon: CalendarDays, t: "College Events", d: "Register in one tap." },
  { icon: PackageSearch, t: "Lost & Found", d: "Reunite with your stuff." },
];

const SHAPES = [
  { c: "left-[6%] top-[18%] size-24 rounded-3xl bg-primary/15", d: 0 },
  { c: "right-[8%] top-[12%] size-16 rounded-full bg-primary/20", d: 1.2 },
  { c: "left-[12%] bottom-[22%] size-12 rounded-full border-2 border-primary/30", d: 0.6 },
  { c: "right-[14%] bottom-[30%] size-20 rotate-12 rounded-2xl border-2 border-primary/25", d: 1.8 },
];

function Index() {
  const reduce = useReducedMotion();
  return (
    <div className="relative min-h-screen overflow-hidden bg-background bg-mesh">
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-pattern opacity-40" />
      {SHAPES.map((s, i) => (
        <motion.div
          key={i}
          aria-hidden
          className={`pointer-events-none absolute hidden sm:block ${s.c}`}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={reduce ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, -18, 0], rotate: [0, 8, 0] }}
          transition={{ opacity: { duration: 0.8, delay: 0.3 + i * 0.1 }, scale: { duration: 0.8, delay: 0.3 + i * 0.1 }, y: { duration: 7, repeat: Infinity, ease: "easeInOut", delay: s.d }, rotate: { duration: 9, repeat: Infinity, ease: "easeInOut", delay: s.d } }}
        />
      ))}

      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5"
      >
        <Logo />
        <Button asChild variant="outline"><Link to="/auth">Sign in</Link></Button>
      </motion.header>

      <main className="relative mx-auto max-w-6xl px-6 pb-20 pt-12 text-center sm:pt-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.1 }}
          className="mx-auto mb-6 flex w-fit"
        >
          <LogoMark className="size-16 rounded-2xl [&_svg]:size-8" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease }}
          className="mx-auto inline-flex rounded-full border bg-card px-3 py-1 text-xs font-medium text-primary"
        >
          For JECRC University · @jecrcu.edu.in
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease }}
          className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.05] text-foreground sm:text-6xl"
        >
          Your whole campus, <span className="text-gradient-primary">in one place.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease }}
          className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg"
        >
          Notices, study notes, papers, deadlines, events and Lost & Found — for students, faculty and the college office.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6, ease }}>
          <Button asChild variant="hero" size="lg" className="group mt-8">
            <Link to="/auth">Sign in with college email <ArrowRight className="transition-transform group-hover:translate-x-1" /></Link>
          </Button>
        </motion.div>

        <motion.div
          className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.75 } } }}
        >
          {FEATURES.map(({ icon: Icon, t, d }) => (
            <motion.div
              key={t}
              variants={{ hidden: { opacity: 0, y: 24, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease } } }}
              whileHover={reduce ? {} : { y: -6 }}
              className="group rounded-2xl border bg-card p-6 text-left shadow-card transition-shadow hover:shadow-glow"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <Icon className="size-5" />
              </div>
              <p className="mt-4 font-display font-semibold text-foreground">{t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
