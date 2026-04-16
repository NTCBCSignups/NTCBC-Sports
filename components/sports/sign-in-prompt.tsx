import SoftballPageShell from "@/components/sports/softball-page-shell";

interface SignInPromptProps {
    sport: string;
}

export default function SignInPrompt({ sport }: SignInPromptProps) {
    return (
        <SoftballPageShell user={null} sport={sport}>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center space-y-3">
                <p className="text-gray-700 font-medium">
                    Sign in to view and sign up for sessions
                </p>
                <p className="text-sm text-gray-500">
                    Use your Google account to get started.
                </p>
            </div>
        </SoftballPageShell>
    );
}
