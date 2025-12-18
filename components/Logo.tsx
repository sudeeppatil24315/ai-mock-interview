import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";

interface LogoProps {
  link?: boolean;
  linkToLanding?: boolean;
  className?: string;
}

export const Logo = ({ link = false, linkToLanding = false, className }: LogoProps) => {
  const content = (
    <div className={clsx("flex items-center", className)}>
      <Image src="/navbarlogo.png" alt="AI ASTRA logo" width={200} height={50} />
    </div>
  );

  if (linkToLanding) {
    const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL || 'http://localhost:5173';
    return <a href={landingUrl}>{content}</a>;
  }

  return link ? <Link href="/">{content}</Link> : content;
};

export default Logo