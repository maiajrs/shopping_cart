import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
} 

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  function upDateAmount({ productId, amount }: UpdateProductAmount) {
    setCart(
      cart.map((product) => {
        if (product.id === productId) {
          const changedProduct = { ...product, amount: amount };

          const oldProducts = localStorage.getItem("@RocketShoes:cart");
          if (typeof oldProducts === "string") {
            const toChangeProducts: Product[] = JSON.parse(oldProducts);

            if (toChangeProducts.length) {
              const newChangedProducts = toChangeProducts.map((newProduct) => {
                if (newProduct.id === product.id) {
                  return {
                    ...newProduct,
                    amount: amount,
                  };
                } else {
                  return newProduct;
                }
              });
              localStorage.setItem(
                "@RocketShoes:cart",
                JSON.stringify(newChangedProducts)
              );
            }
          }

          return changedProduct;
        } else {
          return product;
        }
      })
    );
  }

  const checkStock = async (productId: number) => {
    const { data } = await api.get("/stock");
    const stock: Stock[] = data;
    const filteredStock = stock.filter((valor) => {
      return valor.id === productId;
    });

    const cardFiltered = cart.filter((valor) => {
      return valor.id === productId;
    });

    return filteredStock[0].amount <= (cardFiltered[0]?.amount || 0);
  };

  const addProduct = async (productId: number) => {
    try {
      if (await checkStock(productId).then((res) => res))
        throw new Error("Quantidade solicitada fora de estoque");

      if (
        cart.filter((producIfExist) => producIfExist.id === productId).length
      ) {
        setCart(
          cart.map((product) => {
            if (product.id === productId) {
              const changedProduct = { ...product, amount: product.amount + 1 };

              const oldProducts = localStorage.getItem("@RocketShoes:cart");
              if (typeof oldProducts === "string") {
                const toChangeProducts: Product[] = JSON.parse(oldProducts);

                if (toChangeProducts.length) {
                  const newChangedProducts = toChangeProducts.map(
                    (newProduct) => {
                      if (newProduct.id === product.id) {
                        return {
                          ...newProduct,
                          amount: newProduct.amount + 1,
                        };
                      } else {
                        return newProduct;
                      }
                    }
                  );
                  localStorage.setItem(
                    "@RocketShoes:cart",
                    JSON.stringify(newChangedProducts)
                  );
                }
              }

              return changedProduct;
            } else {
              return product;
            }
          })
        );
      } else {
        const response = await api.get("/products/" + productId);
        const newCard = [...cart, { ...response.data, amount: 1 }];
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCard));
        setCart(newCard);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      setCart(cart.filter((product) => product.id !== productId));
      const localProducts = localStorage.getItem("@RocketShoes:cart");
      if (localProducts === "string") {
        const productParsed: Product[] = JSON.parse(localProducts);
        const newProductsParsed = productParsed.filter((oldProduct) => {
          return oldProduct.id !== productId;
        });

        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(newProductsParsed)
        );
      }
    } catch(e) {
      toast.error('Erro ao deletar o produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const cardFiltered = cart.filter((valor) => {
        return valor.id === productId;
      });
      if (!(amount <= cardFiltered[0].amount)) {
        if (await checkStock(productId).then((res) => res))
          throw new Error("Quantidade solicitada fora de estoque");
      }
      upDateAmount({ productId, amount });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
