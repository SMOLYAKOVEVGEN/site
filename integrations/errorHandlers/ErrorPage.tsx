import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 text-center">
      <div>
        <h1 className="font-heading text-4xl text-graphite mb-4">Что-то пошло не так</h1>
        <p className="font-paragraph text-steel-gray mb-8">Попробуйте вернуться на главную страницу.</p>
        <Link to="/">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">На главную</Button>
        </Link>
      </div>
    </div>
  );
}
