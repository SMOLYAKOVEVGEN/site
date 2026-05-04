import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { usePageMeta } from '@/lib/use-page-meta';

export default function NotFoundPage() {
  usePageMeta({
    title: 'Страница не найдена',
    description: 'Страница не найдена или была перемещена.',
  });
  return (
    <div id="main" role="main" className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <section className="flex-1 flex items-center justify-center py-24">
        <div className="max-w-2xl mx-auto px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="font-heading text-9xl text-primary mb-8">404</div>
            <h1 className="font-heading text-4xl lg:text-5xl text-graphite mb-6">
              Страница не найдена
            </h1>
            <p className="font-paragraph text-xl text-steel-gray mb-12">
              К сожалению, запрашиваемая страница не существует или была перемещена
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-paragraph text-lg px-8 py-6 h-auto">
                  <Home className="mr-2 h-5 w-5" />
                  На главную
                </Button>
              </Link>
              <Link to="/search">
                <Button size="lg" variant="outline" className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-paragraph text-lg px-8 py-6 h-auto">
                  <Search className="mr-2 h-5 w-5" />
                  Поиск по сайту
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}
