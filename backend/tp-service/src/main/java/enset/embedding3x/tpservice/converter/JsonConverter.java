package enset.embedding3x.tpservice.converter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Stores complex objects as JSON TEXT in PostgreSQL.
 * Avoids creating many small tables for nested TP data structures.
 */
public class JsonConverter {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    @Converter
    public static class StringListConverter implements AttributeConverter<List<String>, String> {
        @Override
        public String convertToDatabaseColumn(List<String> attribute) {
            if (attribute == null) return "[]";
            try { return MAPPER.writeValueAsString(attribute); }
            catch (Exception e) { return "[]"; }
        }

        @Override
        public List<String> convertToEntityAttribute(String dbData) {
            if (dbData == null || dbData.isBlank()) return Collections.emptyList();
            try { return MAPPER.readValue(dbData, new TypeReference<>() {}); }
            catch (Exception e) { return Collections.emptyList(); }
        }
    }

    @Converter
    public static class MapListConverter implements AttributeConverter<List<Map<String, Object>>, String> {
        @Override
        public String convertToDatabaseColumn(List<Map<String, Object>> attribute) {
            if (attribute == null) return "[]";
            try { return MAPPER.writeValueAsString(attribute); }
            catch (Exception e) { return "[]"; }
        }

        @Override
        public List<Map<String, Object>> convertToEntityAttribute(String dbData) {
            if (dbData == null || dbData.isBlank()) return Collections.emptyList();
            try { return MAPPER.readValue(dbData, new TypeReference<>() {}); }
            catch (Exception e) { return Collections.emptyList(); }
        }
    }

    @Converter
    public static class MapConverter implements AttributeConverter<Map<String, Object>, String> {
        @Override
        public String convertToDatabaseColumn(Map<String, Object> attribute) {
            if (attribute == null) return "{}";
            try { return MAPPER.writeValueAsString(attribute); }
            catch (Exception e) { return "{}"; }
        }

        @Override
        public Map<String, Object> convertToEntityAttribute(String dbData) {
            if (dbData == null || dbData.isBlank()) return Collections.emptyMap();
            try { return MAPPER.readValue(dbData, new TypeReference<>() {}); }
            catch (Exception e) { return Collections.emptyMap(); }
        }
    }
}
