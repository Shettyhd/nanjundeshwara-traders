import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/useCart";
import "./Cart.css";

export default function Cart() {
  const navigate = useNavigate();

  const {
    cartItems,
    cartCount,
    cartTotal,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const formatPrice = (price) =>
    `₹${Number(price || 0).toLocaleString("en-IN")}`;

  if (cartItems.length === 0) {
    return (
      <main className="cart-page">
        <Link to="/" className="cart-back">
          ← Continue Shopping
        </Link>

        <div className="cart-empty">
          <div className="cart-empty-icon">🛒</div>
          <h1>Your cart is empty</h1>
          <p>
            Discover quality hardware and building materials
            for your next project.
          </p>

          <Link to="/" className="cart-primary-button">
            Explore Products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <Link to="/" className="cart-back">
        ← Continue Shopping
      </Link>

      <div className="cart-heading">
        <div>
          <span className="cart-eyebrow">
            NANJUNDESHWARA TRADERS
          </span>

          <h1>Shopping Cart</h1>

          <p>
            You have {cartCount} item{cartCount !== 1 ? "s" : ""} in
            your cart.
          </p>
        </div>

        <button
          type="button"
          className="cart-clear-button"
          onClick={() => {
            if (window.confirm("Remove all items from your cart?")) {
              clearCart();
            }
          }}
        >
          Clear Cart
        </button>
      </div>

      <div className="cart-layout">
        <section className="cart-items">
          {cartItems.map((item) => (
            <article className="cart-item" key={item._id}>
              <div className="cart-item-image">
                {item.image ? (
                  <img src={item.image} alt={item.name} />
                ) : (
                  <span>🔧</span>
                )}
              </div>

              <div className="cart-item-info">
                <h3>{item.name}</h3>

                <p>{item.brand || "Nanjundeshwara Traders"}</p>

                <strong>{formatPrice(item.price)}</strong>

                <div className="cart-quantity">
                  <button
                    type="button"
                    aria-label={`Decrease ${item.name} quantity`}
                    onClick={() =>
                      updateQuantity(item._id, item.quantity - 1)
                    }
                  >
                    −
                  </button>

                  <span>{item.quantity}</span>

                  <button
                    type="button"
                    aria-label={`Increase ${item.name} quantity`}
                    disabled={item.quantity >= item.stock}
                    onClick={() =>
                      updateQuantity(item._id, item.quantity + 1)
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="cart-item-total">
                <strong>
                  {formatPrice(item.price * item.quantity)}
                </strong>

                <button
                  type="button"
                  className="cart-remove-button"
                  onClick={() => removeFromCart(item._id)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </section>

        <aside className="cart-summary">
          <h2>Order Summary</h2>

          <div className="cart-summary-row">
            <span>Total items</span>
            <span>{cartCount}</span>
          </div>

          <div className="cart-summary-row">
            <span>Subtotal</span>
            <strong>{formatPrice(cartTotal)}</strong>
          </div>

          <div className="cart-summary-row">
            <span>Delivery</span>
            <span>Confirmed at checkout</span>
          </div>

          <div className="cart-summary-total">
            <span>Total</span>
            <strong>{formatPrice(cartTotal)}</strong>
          </div>

          <button
            type="button"
            className="cart-checkout-button"
            onClick={() => navigate("/checkout")}
          >
            Proceed to Checkout →
          </button>

          <p className="cart-summary-note">
            Final delivery charges will be confirmed by the store.
          </p>
        </aside>
      </div>
    </main>
  );
}