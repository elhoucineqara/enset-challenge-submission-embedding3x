package enset.embedding3x.tpservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class TpServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(TpServiceApplication.class, args);
    }
}
