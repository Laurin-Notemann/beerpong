import { BlurView } from 'expo-blur';
import { startTransition, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import ConfirmationModal from '@/components/ConfirmationModal';
import { OverlayIconButton } from '@/components/overlay/OverlayIconButton';
import PillButton from '@/components/PillButton';
import Select from '@/components/Select';
import Text from '@/components/Text';
import {
    RankingAlgorithm,
    rankingAlgorithms,
} from '@/constants/rankingAlgorithms';
import { triggerHapticBump } from '@/haptics';
import { useTheme } from '@/theme';
import { useScopePicker } from '@/zustand/useScopePicker';

const USE_SELECT_IN_SORT_MODAL = false;

const pastSeasonsColor = 'gray';

export interface LeaderboardScopePickerProps {
    hasPastSeasonsButton?: boolean;
    hasSortButton?: boolean;
    isPastSeason?: boolean;
    onlyShowSeason?: string;
}
export const LeaderboardScopePicker: React.FC<LeaderboardScopePickerProps> = ({
    isPastSeason,
    hasPastSeasonsButton = true,
    hasSortButton = true,
    onlyShowSeason,
}) => {
    const scopePicker = useScopePicker();

    const { groupId, group } = useGroup();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const pastSeasons =
        seasonsQuery.data?.data
            ?.filter((i) => i.endDate != null)
            ?.filter((i) => i.numMatches > 0) ?? [];

    function onChange(scope: string) {
        return; // TODO: make this work again

        // Navigate controlled swipers when clicking on tabs
        const optionIndex = ['today', 'season', 'all-time'].indexOf(scope);
        if (optionIndex !== -1) {
            scopePicker.leaderboardSwiperProgress.value = optionIndex;
            scopePicker.setLeaderboardPageIndex(optionIndex);
            return;
        }

        const pastIdx = pastSeasons.findIndex((i) => i.id === scope);
        if (pastIdx !== -1) {
            scopePicker.pastSeasonsSwiperProgress.value = pastIdx;
            scopePicker.setPastSeasonsPageIndex(pastIdx);
        }
    }

    const groupHasPastSeasons = pastSeasons.length > 0;

    type PickerOption = {
        id: string;
        label?: string;
        size?: 'square';
        icon?: string;
    };

    const options: PickerOption[] = onlyShowSeason
        ? (
              seasonsQuery.data?.data?.filter((i) => i.id === onlyShowSeason) ??
              []
          ).map((i) => ({
              id: i.id!,
              label: i.name || 'Unknown',
          }))
        : scopePicker.isPastSeasonsMode
          ? pastSeasons.map((i) => ({
                id: i.id!,
                label: i.name || 'Unknown',
            }))
          : [
                { id: 'today', label: 'Today' },
                {
                    id: 'season',
                    label: group.data?.activeSeason?.name || 'This Season',
                },
                ...(groupHasPastSeasons
                    ? ([
                          { id: 'all-time', label: 'All Time' },
                      ] as PickerOption[])
                    : []),
            ];

    const sidePadding = 8;

    const containerRef = useRef<View>(null);

    const [containerWidth, setContainerWidth] = useState(0);

    // Calculate actual segment widths considering square vs fill sizes
    const segmentWidths = useMemo(() => {
        if (containerWidth === 0) return [];

        const squareWidth = 48;
        const squareCount = options.filter(
            (opt) => opt.size === 'square'
        ).length;
        const fillCount = options.length - squareCount;
        const availableWidth = containerWidth - sidePadding * 2;
        const fillWidth =
            fillCount > 0
                ? (availableWidth - squareCount * squareWidth) / fillCount
                : 0;

        return options.map((opt) =>
            opt.size === 'square' ? squareWidth : fillWidth
        );
    }, [containerWidth, options, sidePadding]);

    // Calculate cumulative positions for each segment
    const segmentPositions = useMemo(() => {
        let cumulative = sidePadding;
        return segmentWidths.map((width) => {
            const position = cumulative;
            cumulative += width;
            return position;
        });
    }, [segmentWidths, sidePadding]);

    const localStaticProgress = useSharedValue(0);

    const swiperProgress =
        onlyShowSeason || options.length <= 1
            ? localStaticProgress
            : scopePicker.isPastSeasonsMode
              ? scopePicker.pastSeasonsSwiperProgress
              : scopePicker.leaderboardSwiperProgress;

    const targetX = useDerivedValue(() => {
        const progress = swiperProgress.value;
        const currentIndex = Math.floor(progress);
        const nextIndex = Math.min(
            currentIndex + 1,
            segmentPositions.length - 1
        );
        const interpolationFactor = progress - currentIndex;

        const currentPosition = segmentPositions[currentIndex] || sidePadding;
        const nextPosition = segmentPositions[nextIndex] || currentPosition;

        const interpolatedPosition =
            currentPosition +
            (nextPosition - currentPosition) * interpolationFactor;

        return withSpring(interpolatedPosition, {
            duration: 100,
        });
    }, [swiperProgress, segmentPositions]);

    const targetWidth = useDerivedValue(() => {
        const progress = swiperProgress.value;
        const currentIndex = Math.floor(progress);
        const nextIndex = Math.min(currentIndex + 1, segmentWidths.length - 1);
        const interpolationFactor = progress - currentIndex;

        const currentWidth = segmentWidths[currentIndex] || 0;
        const nextWidth = segmentWidths[nextIndex] || currentWidth;

        const interpolatedWidth =
            currentWidth + (nextWidth - currentWidth) * interpolationFactor;

        return withSpring(interpolatedWidth, {
            duration: 100,
        });
    }, [swiperProgress, segmentWidths]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: targetX.value }],
        width: targetWidth.value,
    }));

    const theme = useTheme();

    const [showSortModal, setShowSortModal] = useState(false);

    const isPastSeasonsMode = isPastSeason ?? scopePicker.isPastSeasonsMode;

    const styles = useMemo(
        () =>
            StyleSheet.create({
                container: {
                    flexDirection: 'row',

                    height: 48,

                    borderRadius: 99,

                    overflow: 'hidden',

                    backgroundColor: isPastSeasonsMode
                        ? pastSeasonsColor
                        : theme.overlay.backgroundColor,

                    flexShrink: 1,
                },
                active: {
                    position: 'absolute',

                    top: 8,

                    backgroundColor: theme.overlay.highlightColor,

                    borderRadius: 99,

                    height: 32,
                },
                tab: {
                    alignItems: 'center',
                    justifyContent: 'center',

                    height: '100%',
                },
            }),
        [theme, isPastSeasonsMode, hasPastSeasonsButton]
    );

    const groupRankingAlgorithm =
        group.data?.activeSeason?.seasonSettings?.rankingAlgorithm ?? 'ELO';

    const sortOptions = Object.entries(rankingAlgorithms)
        .filter((i) => i[1].showInSelect)
        .map(([id, i]) => {
            return {
                value: id,
                title:
                    i.name +
                    (groupRankingAlgorithm === id ? ' (Group Default)' : ''),
                buttonTitle: i.shortName,
            };
        });

    return (
        <>
            <ConfirmationModal
                onClose={() => setShowSortModal(false)}
                title="Sort Players By"
                actions={
                    USE_SELECT_IN_SORT_MODAL
                        ? undefined
                        : sortOptions.map((i) => ({
                              title: i.title,
                              onPress: () => {
                                  scopePicker.setRankingAlgorithm(
                                      i.value as RankingAlgorithm
                                  );
                                  setShowSortModal(false);
                              },
                          }))
                }
                content={
                    USE_SELECT_IN_SORT_MODAL ? (
                        <Select
                            color="light"
                            value={scopePicker.rankingAlgorithm}
                            style={{
                                marginHorizontal: 16,
                            }}
                            onChange={(id) => {
                                scopePicker.setRankingAlgorithm(
                                    id as RankingAlgorithm
                                );
                                setShowSortModal(false);
                            }}
                            items={sortOptions}
                        />
                    ) : undefined
                }
                isVisible={showSortModal}
            />
            <View style={{ gap: 4 }}>
                {options.length > 0 && hasSortButton && (
                    <View style={{ flexDirection: 'row', paddingLeft: 4 }}>
                        <PillButton
                            backgroundColor={
                                isPastSeasonsMode ? '#555' : undefined
                            }
                            blur={!isPastSeasonsMode}
                            label={
                                scopePicker.rankingAlgorithm
                                    ? `Sorted by ${sortOptions.find((i) => i.value === scopePicker.rankingAlgorithm)?.buttonTitle}`
                                    : 'Sort'
                            }
                            iconName="swap-vertical"
                            onPress={() => setShowSortModal(true)}
                            onRemove={
                                scopePicker.rankingAlgorithm
                                    ? () => {
                                          startTransition(() => {
                                              scopePicker.setRankingAlgorithm(
                                                  undefined
                                              );
                                          });
                                          triggerHapticBump('toast:success');
                                      }
                                    : undefined
                            }
                        />
                    </View>
                )}

                <View
                    style={{
                        flexDirection: 'row',

                        justifyContent: 'flex-end',

                        height: 48,

                        gap: 4,
                        marginBottom: 4,
                    }}
                >
                    {options.length > 0 && (
                        <View
                            ref={containerRef}
                            style={styles.container}
                            onLayout={() => {
                                containerRef.current?.measure(
                                    (x, y, width, height) => {
                                        setContainerWidth(width);
                                    }
                                );
                            }}
                        >
                            <BlurView
                                intensity={70}
                                tint={theme.blur.tint}
                                style={{
                                    flexDirection: 'row',

                                    width: '100%',
                                    height: '100%',
                                }}
                            >
                                <Animated.View
                                    style={[styles.active, animatedStyle]}
                                />
                                {options.map((option) => (
                                    <Pressable
                                        key={option.id}
                                        style={{
                                            ...styles.tab,
                                            width:
                                                option.size === 'square'
                                                    ? 48 + 8
                                                    : undefined,
                                            flex:
                                                option.size === 'square'
                                                    ? 0
                                                    : 1,
                                        }}
                                        onPress={() => {
                                            triggerHapticBump('selection');
                                            onChange(option.id);
                                        }}
                                    >
                                        {option.label && (
                                            <Text
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {option.label}
                                            </Text>
                                        )}
                                        {option.icon && (
                                            <Icon
                                                name={option.icon}
                                                color={
                                                    theme.color.text.secondary
                                                }
                                                size={16}
                                            />
                                        )}
                                    </Pressable>
                                ))}
                            </BlurView>
                        </View>
                    )}
                    {hasPastSeasonsButton && (
                        <OverlayIconButton
                            iconName="cards"
                            onPress={() => {
                                startTransition(() => {
                                    scopePicker.setIsPastSeasonsMode(
                                        !isPastSeasonsMode
                                    );
                                });
                            }}
                            backgroundColor={
                                isPastSeasonsMode ? pastSeasonsColor : undefined
                            }
                        />
                    )}
                </View>
            </View>
        </>
    );
};
