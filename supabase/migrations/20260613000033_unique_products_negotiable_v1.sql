-- RIKU STORE: semua produk unik dapat dinego, produk massal tidak.

update public.products
set
  allow_negotiation = (product_type = 'unique'),
  negotiation_min_price = case
    when product_type = 'unique' then negotiation_min_price
    else null
  end,
  updated_at = now();

create or replace function public.enforce_product_negotiation_by_type()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.product_type = 'unique' then
    new.allow_negotiation := true;
  else
    new.allow_negotiation := false;
    new.negotiation_min_price := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_product_negotiation_by_type on public.products;

create trigger trg_enforce_product_negotiation_by_type
before insert or update of product_type, allow_negotiation, negotiation_min_price
on public.products
for each row
execute function public.enforce_product_negotiation_by_type();
