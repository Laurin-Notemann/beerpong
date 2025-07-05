package pro.beerpong.api.sockets;

import com.google.gson.TypeAdapter;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import com.google.gson.stream.JsonWriter;

import java.io.IOException;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

public class LocalTimeAdapter extends TypeAdapter<LocalTime> {
  public static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

  @Override
  public void write(JsonWriter out, LocalTime value) throws IOException {
    if (value == null) {
      out.nullValue();
    } else {
      out.value(value.format(FORMATTER));
    }
  }

  @Override
  public LocalTime read(JsonReader in) throws IOException {
    if (in.peek() == JsonToken.NULL) {
      in.nextNull();
      return null;
    } else {
      String timeString = in.nextString();
      return LocalTime.parse(timeString, FORMATTER);
    }
  }
}