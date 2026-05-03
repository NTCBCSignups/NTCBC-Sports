import SportPageShell from "@/components/sports/sport-page-shell";
import { sportsConfig } from "@/config/sports-config";

interface SignInPromptProps {
    sport: string;
}

export default function SignInPrompt({ sport }: SignInPromptProps) {
    const config = sportsConfig[sport];

    return (
        <SportPageShell user={null} sport={sport} showDescription={false}>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center space-y-3">
                <p className="text-gray-700 font-medium">
                    Sign in to view and sign up for sessions
                </p>
                <p className="text-sm text-gray-500">
                    Use your Google account to get started.
                </p>
            </div>

            {config?.notes && config.notes.length > 0 && (
                <div>
                    <h2 className="font-semibold text-gray-900 mb-2">Important Notes</h2>
                    <ul className="space-y-2.5 ml-4 text-gray-700">
                        {config.notes.map((note) => (
                            <li key={note} className="flex items-start text-sm">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-1.5 shrink-0"></div>
                                <span>{note}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </SportPageShell>
    );
}
