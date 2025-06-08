package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;
import lombok.SneakyThrows;

@Entity(name = "rules")
@Data
public class Rule implements Cloneable {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String title;

    @Column(length = 9999)
    private String description;

    @ManyToOne
    @JoinColumn(name = "seasonId")
    private Season season;

    @ManyToOne
    @JoinColumn(name = "createdBy")
    private GroupMember createdBy;

    @Override
    @SneakyThrows
    public Rule clone() {
        return (Rule) super.clone();
    }
}
