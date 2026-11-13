import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class MockLoginServer {

    public static void main(String[] args) throws IOException {

        HttpServer server = HttpServer.create(
                new InetSocketAddress("127.0.0.1", 3000), 0
        );

        server.createContext("/auth/login", exchange -> {

            if (!"POST".equalsIgnoreCase(
                    exchange.getRequestMethod())) {
                respond(exchange, 405,
                        "{\"error\":\"Method not allowed\"}");
                return;
            }

            String body = new String(
                    exchange.getRequestBody().readAllBytes(),
                    StandardCharsets.UTF_8
            );

            if (!body.contains("\"username\"") ||
                    !body.contains("\"password\"")) {

                respond(exchange, 400,
                        "{\"error\":\"Missing credentials\"}");
                return;
            }

            respond(exchange, 201,
                    "{\"token\":\"local-mock-token\"}");
        });

        server.start();

        System.out.println(
                "Mock login iniciado en http://127.0.0.1:3000/auth/login"
        );
    }

    private static void respond(
            HttpExchange exchange,
            int status,
            String body
    ) throws IOException {

        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);

        exchange.getResponseHeaders().set(
                "Content-Type", "application/json"
        );

        exchange.sendResponseHeaders(status, bytes.length);

        try (OutputStream out = exchange.getResponseBody()) {
            out.write(bytes);
        }
    }
}
