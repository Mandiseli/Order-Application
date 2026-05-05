import { renderHook, act } from "@testing-library/react";
import { expect, test } from "@jest/globals";
import { useCart } from "./useCart";

test("should add item to cart", () => {
  const { result } = renderHook(() => useCart());

  act(() => {
    result.current.addToCart({
      menuItemId: 1,
      name: "Burger",
      price: 50,
      quantity: 1
    });
  });

  expect(result.current.cart.length).toBe(1);
});