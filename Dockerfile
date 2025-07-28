FROM rust:1.88.0-slim as build
WORKDIR /usr/src/fiber-dashbord-backend

RUN apt-get update && \
    apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY . .
RUN cd /usr/src/fiber-dashbord-backend && cargo build --release

FROM rust:1.88.0-slim
RUN apt-get update && apt-get install libssl3 libssl-dev ca-certificates -y \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app
COPY --from=build /usr/src/fiber-dashbord-backend/target/release/fiber-dashbord /app/fiber-dashbord
CMD ["/app/fiber-dashbord"]
