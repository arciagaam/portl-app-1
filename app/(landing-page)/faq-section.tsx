'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'How do I create an event on Portl?',
    answer:
      'Apply as an organizer through your dashboard, and once approved you can create events with custom ticket types, pricing tiers, and promotional codes — all from one place.',
  },
  {
    question: 'What payment methods are supported?',
    answer:
      'We use PayMongo for secure payment processing, supporting credit/debit cards, GCash, Maya, and other popular Philippine payment methods.',
  },
  {
    question: 'Can I manage a team for my events?',
    answer:
      'Yes. Invite team members with different roles — Admin, Manager, or Member — each with specific access levels for managing events and settings.',
  },
  {
    question: 'How do QR code tickets work?',
    answer:
      'Each ticket includes a unique QR code that attendees can present at the door. Organizers can scan these codes for fast, contactless check-in.',
  },
  {
    question: 'Can I create a branded page for my venue or brand?',
    answer:
      'Every organizer gets a custom subdomain (e.g. yourbrand.portl.com) with a dedicated page showcasing your events, profile, and team.',
  },
  {
    question: 'What are postings and how do they work?',
    answer:
      'Postings are visual event promos — like Instagram-style cards — that highlight your upcoming events and help guests discover what\'s next.',
  },
];

export default function FaqSection() {
  return (
    <section id="faq" className="w-full px-6 md:px-12 py-24 md:py-32">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
        {/* Headline */}
        <div className="md:col-span-5 flex flex-col gap-1">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-tight">
            Frequently
            <br />
            <span className="font-serif italic">asked</span>
            <br />
            questions
          </h2>
        </div>

        {/* Accordion */}
        <div className="md:col-span-7">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-base font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
