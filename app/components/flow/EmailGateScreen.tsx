import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Card } from "../ui/Card";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { loginWithEmail } from "../../../lib/api-client";
import { Turnstile } from '@marsidev/react-turnstile';

interface Props {
  consentAnalysis: boolean;
  consentPhoto: boolean;
  onSuccess: (token: string) => void;
  onBack: () => void;
}

export default function EmailGateScreen({ consentAnalysis, consentPhoto, onSuccess, onBack }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }
    
    setLoading(true);
    setError("");
    
    // if (!turnstileToken) {
    //   setError("Please complete the security check");
    //   setLoading(false);
    //   return;
    // }
    
    try {
      const res = await loginWithEmail(email, turnstileToken || "dummy", consentAnalysis, consentPhoto);
      onSuccess(res.access_token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to continue";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      className="flex flex-col h-screen w-full bg-peach-50 max-w-md mx-auto"
    >
      <div className="p-4 flex items-center">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-900">
          <ArrowLeft size={24} />
        </button>
      </div>
      
      <div className="flex-1 px-6 flex flex-col justify-center pb-20">
        <h2 className="text-3xl font-display font-medium text-gray-900 mb-2">Just one step</h2>
        <p className="text-gray-600 mb-8">Where should we send your detailed report?</p>
        
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <Input 
                type="email" 
                placeholder="you@example.com" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            
            {error && <p className="text-red-500 text-sm">{error}</p>}
            
            <div className="flex justify-center py-2">
              <Turnstile 
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!} 
                onSuccess={(token) => setTurnstileToken(token)}
              />
            </div>
            
            <div className="pt-2">
              <Button type="submit" isLoading={loading}>Continue to Analysis</Button>
            </div>
          </form>
        </Card>
      </div>
    </motion.div>
  );
}
