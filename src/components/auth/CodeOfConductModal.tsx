import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

interface CodeOfConductModalProps {
  children: React.ReactNode;
}

export const CodeOfConductModal = ({ children }: CodeOfConductModalProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Logo size="md" />
          </div>
          <DialogTitle className="text-gradient-cyber text-center">Code of Conduct</DialogTitle>
          <DialogDescription className="text-center">
            Please read and understand our community guidelines
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold text-primary mb-2">🤝 Respect and Inclusion</h3>
              <p className="text-muted-foreground">
                Treat all participants with respect regardless of their background, experience level, or identity. 
                We welcome everyone and strive to create an inclusive environment for learning and competition.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-primary mb-2">🚫 No Cheating</h3>
              <p className="text-muted-foreground">
                This is an individual competition. Do not share answers, collaborate on solutions, or use 
                unauthorized tools. All work must be your own. Plagiarism or copying will result in disqualification.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-primary mb-2">🔒 Fair Play</h3>
              <p className="text-muted-foreground">
                Do not attempt to hack, exploit, or interfere with the competition platform, other participants' 
                accounts, or the judging system. Report any technical issues to the organizers.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-primary mb-2">💬 Communication</h3>
              <p className="text-muted-foreground">
                Keep all communication professional and constructive. No harassment, offensive language, 
                or inappropriate behavior will be tolerated in any form.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-primary mb-2">📚 Learning Focus</h3>
              <p className="text-muted-foreground">
                This competition is designed for learning and skill development. Ask questions, learn from 
                challenges, and help create a positive learning environment for everyone.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-primary mb-2">⚖️ Consequences</h3>
              <p className="text-muted-foreground">
                Violations of this code of conduct may result in warnings, temporary suspension, or 
                permanent disqualification from the competition at the organizers' discretion.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-primary mb-2">📞 Reporting</h3>
              <p className="text-muted-foreground">
                If you witness or experience any violations of this code of conduct, please report them 
                to the Devs@PSU organizers immediately. All reports will be handled confidentially.
              </p>
            </section>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-6">
              <p className="text-center text-primary font-medium">
                By participating in this competition, you agree to abide by this Code of Conduct.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <Button onClick={() => setOpen(false)} className="btn-neon">
            I Understand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};