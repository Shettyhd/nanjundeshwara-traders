import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { CartContext } from "./cartContextValue.js";

// =====================================================
// CONFIGURATION
// =====================================================

const CART_STORAGE_PREFIX = "nanjundeshwara_cart_";

// =====================================================
// GET CURRENT USER KEY
// =====================================================

function getCurrentUserKey() {
  try {
    const user = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    const token = localStorage.getItem("token");

    // Guests have their own cart.
    if (!token || !user) {
      return "guest";
    }

    // Prefer the database user ID.
    const userId =
      user._id ||
      user.id ||
      user.userId;

    if (userId) {
      return String(userId);
    }

    // Use email if the backend does not provide a user ID.
    if (user.email) {
      return String(user.email)
        .trim()
        .toLowerCase();
    }

    // Avoid using a shared customer cart.
    return "user-without-id";
  } catch {
    return "guest";
  }
}

// =====================================================
// CART STORAGE HELPERS
// =====================================================

function getCartStorageKey(userKey) {
  return (
    CART_STORAGE_PREFIX +
    encodeURIComponent(userKey)
  );
}

function readCart(userKey) {
  try {
    const savedCart = localStorage.getItem(
      getCartStorageKey(userKey)
    );

    if (!savedCart) {
      return [];
    }

    const parsedCart = JSON.parse(savedCart);

    return Array.isArray(parsedCart)
      ? parsedCart
      : [];
  } catch (error) {
    console.error("Unable to load cart:", error);
    return [];
  }
}

function saveCart(userKey, cartItems) {
  try {
    localStorage.setItem(
      getCartStorageKey(userKey),
      JSON.stringify(cartItems)
    );
  } catch (error) {
    console.error("Unable to save cart:", error);
  }
}

// =====================================================
// CART PROVIDER
// =====================================================

export function CartProvider({ children }) {
  // Track the currently logged-in customer.
  const [userKey, setUserKey] = useState(
    () => getCurrentUserKey()
  );

  /*
   * Store the customer key together with that customer's cart.
   *
   * This prevents the previous customer's cart from being
   * displayed or saved while switching accounts.
   */
  const [cartState, setCartState] = useState(() => {
    const initialUserKey = getCurrentUserKey();

    return {
      userKey: initialUserKey,
      items: readCart(initialUserKey),
    };
  });

  /*
   * When the account changes, display the new customer's
   * cart immediately from localStorage.
   *
   * No setState call inside useEffect is required.
   */
  const cartItems =
    cartState.userKey === userKey
      ? cartState.items
      : readCart(userKey);

  // =====================================================
  // SYNCHRONIZE LOGIN AND LOGOUT
  // =====================================================

  useEffect(() => {
    function syncUser() {
      const currentUserKey = getCurrentUserKey();

      setUserKey((previousKey) =>
        previousKey === currentUserKey
          ? previousKey
          : currentUserKey
      );
    }

    window.addEventListener(
      "nanjundeshwara-auth-changed",
      syncUser
    );

    window.addEventListener(
      "storage",
      syncUser
    );

    window.addEventListener(
      "focus",
      syncUser
    );

    return () => {
      window.removeEventListener(
        "nanjundeshwara-auth-changed",
        syncUser
      );

      window.removeEventListener(
        "storage",
        syncUser
      );

      window.removeEventListener(
        "focus",
        syncUser
      );
    };
  }, []);

  // =====================================================
  // SAVE CART CHANGES
  // =====================================================

  useEffect(() => {
    /*
     * Only save when cartState belongs to the active user.
     *
     * If the user changes, the previous user's cartState
     * will not be written under the new user's key.
     */
    if (cartState.userKey !== userKey) {
      return;
    }

    saveCart(userKey, cartState.items);
  }, [userKey, cartState]);

  // =====================================================
  // ADD PRODUCT TO CART
  // =====================================================

  const addToCart = useCallback(
    (product, quantity = 1) => {
      if (!product?._id) {
        return false;
      }

      const requestedQuantity = Number(quantity);

      if (
        !Number.isSafeInteger(requestedQuantity) ||
        requestedQuantity < 1
      ) {
        return false;
      }

      if (product.isAvailable === false) {
        return false;
      }

      const stock = Number(product.stock);

      if (
        !Number.isFinite(stock) ||
        stock < 1 ||
        requestedQuantity > stock
      ) {
        return false;
      }

      /*
       * Use the current account's cart as the starting state.
       * Do not modify another customer's cart.
       */
      const activeItems =
        cartState.userKey === userKey
          ? cartState.items
          : readCart(userKey);

      const existingItem = activeItems.find(
        (item) => item._id === product._id
      );

      const existingQuantity = existingItem
        ? Number(existingItem.quantity)
        : 0;

      const newQuantity =
        existingQuantity + requestedQuantity;

      if (
        !Number.isSafeInteger(newQuantity) ||
        newQuantity > stock
      ) {
        return false;
      }

      let updatedItems;

      if (existingItem) {
        updatedItems = activeItems.map((item) =>
          item._id === product._id
            ? {
                ...item,
                ...product,
                quantity: newQuantity,
              }
            : item
        );
      } else {
        updatedItems = [
          ...activeItems,
          {
            ...product,
            quantity: requestedQuantity,
          },
        ];
      }

      setCartState({
        userKey,
        items: updatedItems,
      });

      return true;
    },
    [cartState, userKey]
  );

  // =====================================================
  // UPDATE PRODUCT QUANTITY
  // =====================================================

  const updateQuantity = useCallback(
    (productId, quantity) => {
      const newQuantity = Number(quantity);

      const activeItems =
        cartState.userKey === userKey
          ? cartState.items
          : readCart(userKey);

      // Quantity zero or less removes the product.
      if (
        !Number.isSafeInteger(newQuantity) ||
        newQuantity <= 0
      ) {
        setCartState({
          userKey,
          items: activeItems.filter(
            (item) => item._id !== productId
          ),
        });

        return;
      }

      const updatedItems = activeItems.map((item) => {
        if (item._id !== productId) {
          return item;
        }

        const stock = Number(item.stock);

        // Do not allow a quantity above available stock.
        if (
          Number.isFinite(stock) &&
          newQuantity > stock
        ) {
          return item;
        }

        return {
          ...item,
          quantity: newQuantity,
        };
      });

      setCartState({
        userKey,
        items: updatedItems,
      });
    },
    [cartState, userKey]
  );

  // =====================================================
  // REMOVE PRODUCT FROM CART
  // =====================================================

  const removeFromCart = useCallback(
    (productId) => {
      const activeItems =
        cartState.userKey === userKey
          ? cartState.items
          : readCart(userKey);

      const updatedItems = activeItems.filter(
        (item) => item._id !== productId
      );

      setCartState({
        userKey,
        items: updatedItems,
      });
    },
    [cartState, userKey]
  );

  // =====================================================
  // CLEAR CURRENT CUSTOMER'S CART
  // =====================================================

  const clearCart = useCallback(() => {
    setCartState({
      userKey,
      items: [],
    });
  }, [userKey]);

  // =====================================================
  // CART COUNT
  // =====================================================

  const cartCount = useMemo(
    () =>
      cartItems.reduce(
        (total, item) =>
          total + Number(item.quantity || 0),
        0
      ),
    [cartItems]
  );

  // =====================================================
  // CART TOTAL
  // =====================================================

  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) =>
          total +
          Number(item.price || 0) *
            Number(item.quantity || 0),
        0
      ),
    [cartItems]
  );

  // =====================================================
  // CONTEXT VALUE
  // =====================================================

  const value = useMemo(
    () => ({
      cartItems,
      cartCount,
      cartTotal,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    }),
    [
      cartItems,
      cartCount,
      cartTotal,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    ]
  );

  // =====================================================
  // PROVIDER
  // =====================================================

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}