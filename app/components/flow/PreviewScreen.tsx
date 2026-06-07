import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

interface Props {
  photoBlob: Blob | null;
  onRetake: () => void;
  onNext: () => void;
}

export default function PreviewScreen({ photoBlob, onRetake, onNext }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (photoBlob) {
      const u = URL.createObjectURL(photoBlob);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
  }, [photoBlob]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className="flex flex-col h-screen w-full bg-peach-50"
    >
      <div className="p-4 flex items-center">
        <button onClick={onRetake} className="p-2 -ml-2 text-gray-900">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-display font-medium ml-2">Preview</h2>
      </div>

      <div className="flex-1 p-4 flex flex-col items-center">
        {url && (
          <div className="flex-1 w-full relative rounded-2xl overflow-hidden shadow-lg border-2 border-white mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={url} 
              alt="Preview" 
              className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
            />
          </div>
        )}
        
        <div className="w-full space-y-3 pb-6 max-w-md">
          <Button onClick={onNext} variant="primary">Use this photo</Button>
          <Button onClick={onRetake} variant="outline">Retake</Button>
        </div>
      </div>
    </motion.div>
  );
}
