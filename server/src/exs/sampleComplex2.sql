CREATE TABLE products (
  product_id   INT             NOT NULL PRIMARY KEY,
  sku          CHAR(8)         NOT NULL UNIQUE,
  name         VARCHAR(100)    NOT NULL,
  description  VARCHAR(100),
  category_id  INT             NOT NULL,
  price        DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  status       VARCHAR(20)     NOT NULL DEFAULT 'active',
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

