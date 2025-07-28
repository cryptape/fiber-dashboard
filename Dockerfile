FROM rust:1.88.0 as build
WORKDIR /usr/src/fiber-dashbord-backend
COPY . .
RUN cd /usr/src/fiber-dashbord-backend && cargo build --release

FROM rust:1.88.0
RUN apt-get update && apt-get install libssl3 ca-certificates -y

WORKDIR /app
COPY --from=build /usr/src/fiber-dashbord-backend/target/release/fiber-dashbord /app/fiber-dashbord
CMD ["/app/fiber-dashbord"]
