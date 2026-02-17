const HeroIllustration = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circles */}
        <circle cx="200" cy="200" r="180" fill="hsl(210 100% 65% / 0.05)" />
        <circle cx="200" cy="200" r="140" fill="hsl(210 100% 65% / 0.08)" />
        <circle cx="200" cy="200" r="100" fill="hsl(210 100% 65% / 0.12)" />
        
        {/* Code editor window */}
        <g transform="translate(80, 100)">
          <rect
            x="0"
            y="0"
            width="240"
            height="180"
            rx="8"
            fill="hsl(220 14% 11%)"
            stroke="hsl(220 10% 18%)"
            strokeWidth="2"
          />
          
          {/* Window header */}
          <rect x="0" y="0" width="240" height="30" rx="8" fill="hsl(220 12% 14%)" />
          <circle cx="15" cy="15" r="4" fill="hsl(0 84% 60%)" />
          <circle cx="30" cy="15" r="4" fill="hsl(48 96% 53%)" />
          <circle cx="45" cy="15" r="4" fill="hsl(142 72% 54%)" />
          
          {/* Code lines */}
          <rect x="15" y="45" width="80" height="6" rx="3" fill="hsl(280 65% 72%)" opacity="0.8" />
          <rect x="15" y="60" width="120" height="6" rx="3" fill="hsl(100 55% 62%)" opacity="0.7" />
          <rect x="30" y="75" width="90" height="6" rx="3" fill="hsl(200 75% 72%)" opacity="0.7" />
          <rect x="30" y="90" width="100" height="6" rx="3" fill="hsl(210 100% 65%)" opacity="0.8" />
          <rect x="15" y="105" width="70" height="6" rx="3" fill="hsl(280 65% 72%)" opacity="0.7" />
          <rect x="30" y="120" width="110" height="6" rx="3" fill="hsl(100 55% 62%)" opacity="0.8" />
          <rect x="15" y="135" width="85" height="6" rx="3" fill="hsl(200 75% 72%)" opacity="0.7" />
          <rect x="15" y="150" width="95" height="6" rx="3" fill="hsl(50 75% 65%)" opacity="0.6" />
        </g>
        
        {/* Floating elements */}
        <g className="animate-float-slow">
          <rect
            x="50"
            y="80"
            width="40"
            height="40"
            rx="6"
            fill="hsl(210 100% 65% / 0.15)"
            stroke="hsl(210 100% 65%)"
            strokeWidth="2"
          />
          <text
            x="70"
            y="105"
            fontSize="20"
            fontWeight="bold"
            fill="hsl(210 100% 65%)"
            textAnchor="middle"
          >
            &#60;/&#62;
          </text>
        </g>
        
        <g className="animate-float-medium">
          <circle
            cx="340"
            cy="120"
            r="25"
            fill="hsl(100 55% 62% / 0.15)"
            stroke="hsl(100 55% 62%)"
            strokeWidth="2"
          />
          <path
            d="M 325 120 L 335 130 L 355 110"
            stroke="hsl(100 55% 62%)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        
        <g className="animate-float-fast">
          <rect
            x="320"
            y="280"
            width="35"
            height="35"
            rx="5"
            fill="hsl(280 65% 72% / 0.15)"
            stroke="hsl(280 65% 72%)"
            strokeWidth="2"
          />
          <circle cx="337.5" cy="297.5" r="8" fill="hsl(280 65% 72%)" />
        </g>
        
        <g className="animate-float-medium" style={{ animationDelay: "1s" }}>
          <path
            d="M 60 300 L 80 280 L 100 300 L 80 320 Z"
            fill="hsl(50 75% 65% / 0.15)"
            stroke="hsl(50 75% 65%)"
            strokeWidth="2"
          />
        </g>
      </svg>
    </div>
  );
};

export default HeroIllustration;
