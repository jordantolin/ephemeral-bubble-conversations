
import { Link } from "react-router-dom";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  withText?: boolean;
}

const Logo = ({ size = "md", withText = true }: LogoProps) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10"
  };

  return (
    <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-105">
      <div className={`${sizeClasses[size]} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffda7b] to-[#ebbd34] rounded-full shadow-md" />
        <div className="absolute inset-[2px] bg-white/90 backdrop-blur-sm rounded-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[#ebbd34] font-bold text-xs sm:text-sm">BW</span>
        </div>
      </div>
      {withText && (
        <span className="font-semibold text-lg sm:text-xl text-[#ebbd34] hidden sm:block">
          Bubble World
        </span>
      )}
    </Link>
  );
};

export default Logo;
