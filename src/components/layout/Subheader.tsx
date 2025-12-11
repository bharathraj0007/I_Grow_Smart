import { Sprout } from 'lucide-react';

export default function Subheader() {
  return (
    <div className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border py-3 px-4 sticky top-16 z-40">
      <div className="container mx-auto flex items-center justify-center gap-2">
        <Sprout className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          I Grow Smart
        </h2>
      </div>
    </div>
  );
}
