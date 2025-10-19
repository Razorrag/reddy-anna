import React from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  return (
    <nav className={cn("flex items-center py-4", className)}>
      <ol className="flex items-center space-x-2 text-sm">
        <li>
          <Link href="/" className="text-gold hover:text-gold-light transition-colors">
            <Home className="w-4 h-4" />
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRight className="w-4 h-4 text-white/60 mx-2" />
            {item.href && !item.active ? (
              <Link 
                href={item.href} 
                className="text-white/80 hover:text-gold transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gold font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;