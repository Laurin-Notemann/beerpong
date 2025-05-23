package pro.beerpong.api.control;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pro.beerpong.api.model.dto.AssetMetadataDto;
import pro.beerpong.api.model.dto.GroupPreset;
import pro.beerpong.api.model.dto.ResponseEnvelope;

import java.util.Arrays;
import java.util.Optional;

@RestController
@RequestMapping("/group-presets")
@RequiredArgsConstructor
public class GroupPresetsController {
    public static final GroupPreset BEERPONG = new GroupPreset("beerpong", "Beerpong", "https://www.shutterstock.com/image-photo/cups-plastic-ball-beer-pong-600nw-1107685832.jpg");
    public static final GroupPreset KICKER = new GroupPreset("kicker", "Kicker", "https://media.istockphoto.com/id/696594232/photo/foosball-at-modern-office-close-up-view.jpg?s=612x612&w=0&k=20&c=skF0hp5i_9ctZ2MmkqLdaOklvwSGbqEqcAu0JLF8M5c=");
    public static final GroupPreset TABLE_TENNIS = new GroupPreset("tabletennis", "Table Tennis", "https://media.istockphoto.com/id/1425158165/photo/table-tennis-ping-pong-paddles-and-white-ball-on-blue-board.jpg?s=612x612&w=0&k=20&c=KSdi4bEGoxdhaGMnl6CZaqTLbKbobArgrrpLem3oN98=");
    public static final GroupPreset CHESS = new GroupPreset("chess", "Chess", "https://media.istockphoto.com/id/1128789429/photo/plan-leading-strategy-of-successful-business-competition-leader-concept-hand-of-player-chess.jpg?s=612x612&w=0&k=20&c=srlCT0xWXduYvZsQgGVYl6B4QAaBjoPjpsceTQrP5XQ=");
    public static final GroupPreset BILLIARDS = new GroupPreset("billiards", "Billiards", "https://media.istockphoto.com/id/1370682737/photo/a-group-of-young-people-came-to-play-billiards-and-in-the-young-hands-was-a-cane-and-layers.jpg?s=612x612&w=0&k=20&c=monjVEGbEEjeau83cCqBScfiR1n9SOaqlZpDEB3-Ioo=");

    public static final GroupPreset[] PRESETS = new GroupPreset[]{
            BEERPONG,
            KICKER,
            TABLE_TENNIS,
            CHESS,
            BILLIARDS
    };

    public static Optional<GroupPreset> byId(@Nullable String id) {
        if (id == null) return Optional.empty();

        return Arrays.stream(PRESETS).filter(groupPreset -> groupPreset.getId().equals(id)).findFirst();
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<GroupPreset[]>> getPresets() {
        return ResponseEnvelope.ok(PRESETS);
    }
}