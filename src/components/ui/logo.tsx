import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export const Logo = ({ size = "md", showText = true, className }: LogoProps) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg", 
    xl: "text-xl"
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img 
        src="/logo.png" 
        alt="Devs@PSU Logo" 
        className={cn(sizeClasses[size], "flex-shrink-0")}
      />
      {showText && (
        <span className={cn(
          "font-semibold text-primary",
          textSizeClasses[size]
        )}>
          Devs@PSU
        </span>
      )}
    </div>
  );
};