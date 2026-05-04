import { Link, useSearchParams } from 'react-router-dom';
import { Lock, ShoppingCart, ArrowRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { usePageMeta } from '@/lib/use-page-meta';

export default function CheckoutAuthRequiredPage() {
  usePageMeta({
    title: 'Требуется вход',
    description: 'Авторизация перед оформлением заказа.',
  });
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/checkout';
  const encodedNext = encodeURIComponent(next);

  return (
    <div id="main" role="main" className="min-h-screen bg-background">
      <Header />

      <section className="bg-graphite text-primary-foreground py-16 sm:py-20">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl mb-4">
            Оформление заказа
          </h1>
          <p className="font-paragraph text-base sm:text-lg text-white/75 max-w-3xl">
            Перед переходом к оформлению необходимо войти в личный кабинет.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="max-w-[760px] mx-auto px-4 sm:px-8">
          <div className="border border-[#d9dde3] bg-white ring-1 ring-black/[0.03] p-8 sm:p-12 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-background border border-graphite/10">
              <Lock className="h-9 w-9 text-primary" />
            </div>

            <h2 className="font-heading text-2xl sm:text-4xl text-graphite mb-4">
              Для оформления заказа нужна авторизация
            </h2>

            <p className="font-paragraph text-steel-gray text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              Авторизуйтесь или зарегистрируйтесь, чтобы продолжить оформление,
              сохранить данные покупателя и отправить заказ.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to={`/account?redirect=${encodedNext}`}>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8">
                  Авторизоваться
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>

              <Link to="/cart">
                <Button variant="outline" className="h-12 px-8">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Вернуться в корзину
                </Button>
              </Link>
            </div>

            <div className="mt-8 text-sm text-steel-gray">
              На странице входа будет доступна и регистрация нового аккаунта.
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}