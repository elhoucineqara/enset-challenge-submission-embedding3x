import * as React from "react";

export type ButtonVariant = "hero" | "heroOutline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonVariantOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

export function buttonVariants({
  variant = "hero",
  size = "md",
  className = "",
}: ButtonVariantOptions = {}) {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cba6f7]/50 disabled:pointer-events-none disabled:opacity-50";

  const sizes: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-sm rounded-lg",
    md: "h-10 px-4 text-sm rounded-xl",
    lg: "h-12 px-6 text-base rounded-2xl",
  };

  const variants: Record<ButtonVariant, string> = {
    hero: "bg-gradient-to-r from-[#cba6f7] to-[#89b4fa] text-[#1a1a2e] font-bold hover:opacity-90",
    heroOutline:
      "border border-[#cba6f7]/50 text-[#cdd6f4] bg-transparent hover:bg-[#cba6f7]/10",
    ghost:
      "bg-transparent text-[#cdd6f4]/70 hover:text-[#cdd6f4] hover:bg-white/5",
  };

  return [base, sizes[size], variants[variant], className].filter(Boolean).join(" ");
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={buttonVariants({ variant, size, className })}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
