'use client'

import { Envelope, Chat, BookOpen, ShieldCheck } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const CONTACT_CHANNELS = [
  {
    icon: Envelope,
    title: 'Email support',
    description: 'support@apax.institutional',
    detail: 'Typical response time: under 4 business hours',
  },
  {
    icon: Chat,
    title: 'Live chat',
    description: 'Available 9am - 6pm, Mon - Fri',
    detail: 'For account and redemption questions',
  },
  {
    icon: BookOpen,
    title: 'Documentation',
    description: 'docs.apax.institutional',
    detail: 'Vault custody, compliance, and API reference',
  },
]

const FAQS = [
  {
    question: 'How is my metal actually held?',
    answer:
      'Every gram of gold, silver, or platinum shown in your portfolio corresponds to physical metal allocated to you in an audited third-party vault. The Proof of Reserve view shows the current reserve ratio between vaulted metal and issued tokens.',
  },
  {
    question: 'How does redemption work?',
    answer:
      'A redemption request goes through a compliance re-check, vault allocation, and a logistics hold before anything is finalized - tokens are only burned once physical fulfillment is confirmed, never before. See the Redemption Portal for details.',
  },
  {
    question: 'Why did my holdings not update immediately?',
    answer:
      'Holdings and activity are refreshed from your account on each visit. If a recent deposit or redemption is not reflected yet, use the Refresh action on the relevant page, or check back in a few minutes.',
  },
  {
    question: 'Is my session secure?',
    answer:
      'Authentication uses an httpOnly session cookie, which cannot be read by page scripts - the standard mitigation against token theft via cross-site scripting. Every request is re-verified server-side.',
  },
  {
    question: 'What is the Zakat Calculator based on?',
    answer:
      'It estimates your Zakat obligation using the nisab thresholds for gold (85g) and silver (595g) against current market prices, applied to your total precious-metal holdings. It is an estimate, not religious guidance - consult a qualified scholar for a binding ruling.',
  },
]

export function HelpView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#E8E8E8]">Help &amp; Support</h1>
        <p className="text-sm text-[#888888] mt-1">
          Answers to common questions, and how to reach us for anything else
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {CONTACT_CHANNELS.map((channel) => (
          <Card key={channel.title} className="glass border-[#2A2A2A] bg-[#111111]">
            <CardHeader className="pb-2">
              <div className="p-2 w-fit rounded-lg bg-[#1A1A1A]">
                <channel.icon className="h-5 w-5 text-[#D4AF37]" />
              </div>
              <CardTitle className="text-sm text-[#E8E8E8] mt-2">{channel.title}</CardTitle>
              <CardDescription className="text-[#C0C0C0]">{channel.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#888888]">{channel.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass border-[#2A2A2A] bg-[#111111]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1A1A1A]">
              <ShieldCheck weight="light" className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <div>
              <CardTitle className="text-[#E8E8E8]">Frequently asked questions</CardTitle>
              <CardDescription className="text-[#888888]">
                The most common questions about custody, redemption, and your account
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, index) => (
              <AccordionItem
                key={faq.question}
                value={`faq-${index}`}
                className="border-[#2A2A2A]"
              >
                <AccordionTrigger className="text-[#E8E8E8] hover:text-[#D4AF37] text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-[#888888]">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card className="glass border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/5 to-transparent">
        <CardContent className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#E8E8E8]">Still need help?</p>
            <p className="text-xs text-[#888888] mt-1">
              Our support team can look into your account directly.
            </p>
          </div>
          <Button
            asChild
            className="metallic-shine bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#E6C861] font-semibold"
          >
            <a href="mailto:support@apax.institutional">Email support</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
