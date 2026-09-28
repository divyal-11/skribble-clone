import { Palette } from "lucide-react";

interface WordChoosingBannerProps {
  drawerName: string;
}

export function WordChoosingBanner({ drawerName }: WordChoosingBannerProps) {
  return (
    <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4 animate-pulse">
        <Palette className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-black text-white tracking-wide mb-1">
        {drawerName} is choosing a word...
      </h3>
      <p className="text-sm text-zinc-400 font-medium">
        Get ready to guess as soon as they start drawing!
      </p>
    </div>
  );
}
