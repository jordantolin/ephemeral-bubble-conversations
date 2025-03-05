
import { Link } from "react-router-dom";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  withText?: boolean;
  className?: string;
}

const Logo = ({ size = "md", withText = true, className = "" }: LogoProps) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10"
  };

  return (
    <div className={`relative overflow-hidden ${sizeClasses[size]} ${className}`}>
      <img 
        src="/lovable-uploads/dd70f452-6f79-4ba9-9293-885601e88a7b.png" 
        alt="Bubble Trouble Logo" 
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default Logo;
