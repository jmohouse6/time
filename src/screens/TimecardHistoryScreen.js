import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Text,
  Chip,
  FAB,
  Searchbar,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

import { TimeclockService } from '../services/TimeclockService';
import { ExportService } from '../services/ExportService';

export default function TimecardHistoryScreen() {
  const [timecards, setTimecards] = useState([]);
  const [filteredTimecards, setFilteredTimecards] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    totalHours: 0,
    regularHours: 0,
    overtimeHours: 0,
    doubleTimeHours: 0,
  });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadTimecards();
  }, []);

  useEffect(() => {
    filterTimecards();
  }, [timecards, selectedPeriod, searchQuery]);

  const loadTimecards = async () => {
    try {
      const allTimecards = await TimeclockService.getTimecards();
      setTimecards(allTimecards);
    } catch (error) {
      console.error('Error loading timecards:', error);
      Alert.alert('Error', 'Failed to load timecard history');
    }
  };

  const filterTimecards = () => {
    let filtered = timecards;

    // Filter by period
    const now = new Date();
    let startDate, endDate;

    switch (selectedPeriod) {
      case 'week':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'all':
        startDate = null;
        endDate = null;
        break;
    }

    if (startDate && endDate) {
      filtered = filtered.filter(tc => {
        const tcDate = parseISO(tc.date);
        return tcDate >= startDate && tcDate <= endDate;
      });
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(tc =>
        (tc.job && tc.job.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tc.task && tc.task.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        tc.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTimecards(filtered);
    calculateSummary(filtered);
  };

  const calculateSummary = (timecards) => {
    // Group by date
    const dailyHours = {};
    timecards.forEach(tc => {
      if (!dailyHours[tc.date]) {
        dailyHours[tc.date] = [];
      }
      dailyHours[tc.date].push(tc);
    });

    let totalHours = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    let doubleTimeHours = 0;

    Object.keys(dailyHours).forEach(date => {
      const dayHours = TimeclockService.calculateDayHours(dailyHours[date]);
      totalHours += dayHours;

      // Calculate overtime breakdown based on California law
      if (dayHours > 12) {
        regularHours += 8;
        overtimeHours += 4; // hours 8-12
        doubleTimeHours += dayHours - 12; // hours 12+
      } else if (dayHours > 8) {
        regularHours += 8;
        overtimeHours += dayHours - 8; // hours 8-12
      } else {
        regularHours += dayHours;
      }
    });

    setSummary({
      totalHours,
      regularHours,
      overtimeHours,
      doubleTimeHours,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTimecards();
    setRefreshing(false);
  };

  const exportData = () => {
    Alert.alert(
      'Export Format',
      'Choose export format:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'CSV', onPress: () => performExport('csv') },
        { text: 'JSON', onPress: () => performExport('json') },
        { text: 'HTML Report', onPress: () => performExport('pdf') },
      ]
    );
  };

  const performExport = async (format) => {
    setExporting(true);
    try {
      const result = await ExportService.exportTimecardData(filteredTimecards, { format });
      Alert.alert('Success', `Exported ${result.recordCount} records to ${result.fileName}`);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const submitForApproval = (date) => {
    Alert.alert(
      'Submit for Approval',
      `Submit timecard for ${format(parseISO(date), 'MMMM d, yyyy')} for supervisor approval?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              await TimeclockService.submitForApproval(date);
              Alert.alert('Success', 'Timecard submitted for approval');
              await loadTimecards();
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to submit for approval');
            }
          },
        },
      ]
    );
  };

  const getTimecardsByDate = () => {
    const grouped = {};
    filteredTimecards.forEach(tc => {
      if (!grouped[tc.date]) {
        grouped[tc.date] = [];
      }
      grouped[tc.date].push(tc);
    });

    // Sort dates in descending order
    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
    
    return sortedDates.map(date => ({
      date,
      timecards: grouped[date].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
      totalHours: TimeclockService.calculateDayHours(grouped[date]),
    }));
  };

  const getTypeIcon = (type) => {
    const iconMap = {
      'clock_in': 'login',
      'clock_out': 'logout',
      'lunch_out': 'restaurant',
      'lunch_in': 'restaurant-menu',
    };
    return iconMap[type] || 'access-time';
  };

  const getTypeColor = (type) => {
    const colorMap = {
      'clock_in': '#4CAF50',
      'clock_out': '#F44336',
      'lunch_out': '#FF9800',
      'lunch_in': '#2196F3',
    };
    return colorMap[type] || '#666';
  };

  const getStatusChip = (timecards) => {
    const hasSubmitted = timecards.some(tc => tc.status === 'submitted');
    const hasApproved = timecards.some(tc => tc.status === 'approved');
    
    if (hasApproved) {
      return <Chip icon="check-circle" style={styles.approvedChip}>Approved</Chip>;
    } else if (hasSubmitted) {
      return <Chip icon="hourglass-empty" style={styles.pendingChip}>Pending Approval</Chip>;
    } else {
      return <Chip icon="edit" style={styles.draftChip}>Draft</Chip>;
    }
  };

  const periodButtons = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ];

  const dailyTimecards = getTimecardsByDate();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>Timecard History</Title>
      </View>

      <View style={styles.controls}>
        <SegmentedButtons
          value={selectedPeriod}
          onValueChange={setSelectedPeriod}
          buttons={periodButtons}
          style={styles.periodButtons}
        />

        <Searchbar
          placeholder="Search by job, task, or action..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      {/* Summary Card */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Title style={styles.summaryTitle}>Hours Summary</Title>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.totalHours.toFixed(1)}</Text>
              <Text style={styles.summaryLabel}>Total Hours</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.regularHours.toFixed(1)}</Text>
              <Text style={styles.summaryLabel}>Regular</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#FF9800' }]}>
                {summary.overtimeHours.toFixed(1)}
              </Text>
              <Text style={styles.summaryLabel}>Overtime</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                {summary.doubleTimeHours.toFixed(1)}
              </Text>
              <Text style={styles.summaryLabel}>Double Time</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {dailyTimecards.map(({ date, timecards, totalHours }) => (
          <Card key={date} style={styles.dayCard}>
            <Card.Content>
              <View style={styles.dayHeader}>
                <View>
                  <Title style={styles.dayTitle}>
                    {format(parseISO(date), 'EEEE, MMMM d')}
                  </Title>
                  <Paragraph style={styles.dayHours}>
                    {totalHours.toFixed(1)} hours
                  </Paragraph>
                </View>
                <View style={styles.dayActions}>
                  {getStatusChip(timecards)}
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => submitForApproval(date)}
                    disabled={timecards.some(tc => tc.status === 'submitted' || tc.status === 'approved')}
                    style={styles.submitButton}
                  >
                    Submit
                  </Button>
                </View>
              </View>

              {timecards.map(tc => (
                <View key={tc.id} style={styles.timecardItem}>
                  <View style={styles.timecardHeader}>
                    <Icon
                      name={getTypeIcon(tc.type)}
                      size={20}
                      color={getTypeColor(tc.type)}
                    />
                    <Text style={styles.timecardType}>
                      {tc.type.replace('_', ' ').toUpperCase()}
                    </Text>
                    <Text style={styles.timecardTime}>
                      {format(parseISO(tc.timestamp), 'h:mm a')}
                    </Text>
                  </View>
                  
                  {tc.job && (
                    <View style={styles.timecardDetails}>
                      <Chip icon="work" compact style={styles.jobChip}>
                        {tc.job.name}
                      </Chip>
                      {tc.task && (
                        <Chip icon="assignment" compact style={styles.taskChip}>
                          {tc.task.name}
                        </Chip>
                      )}
                    </View>
                  )}

                  {tc.location && (
                    <Text style={styles.locationText}>
                      📍 {tc.location.latitude?.toFixed(4)}, {tc.location.longitude?.toFixed(4)}
                    </Text>
                  )}
                </View>
              ))}
            </Card.Content>
          </Card>
        ))}

        {dailyTimecards.length === 0 && (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <View style={styles.emptyContent}>
                <Icon name="history" size={48} color="#999" />
                <Title style={styles.emptyTitle}>No timecards found</Title>
                <Paragraph style={styles.emptyText}>
                  {searchQuery ? 'Try adjusting your search or time period' : 'Start clocking in to see your timecard history'}
                </Paragraph>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <FAB
        icon="download"
        style={styles.fab}
        onPress={exportData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200EE',
  },
  controls: {
    padding: 16,
    paddingTop: 0,
  },
  periodButtons: {
    marginBottom: 16,
  },
  searchbar: {
    marginBottom: 16,
  },
  summaryCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6200EE',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  dayCard: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dayTitle: {
    fontSize: 18,
  },
  dayHours: {
    color: '#666',
    marginTop: 4,
  },
  dayActions: {
    alignItems: 'flex-end',
  },
  submitButton: {
    marginTop: 8,
  },
  approvedChip: {
    backgroundColor: '#E8F5E8',
  },
  pendingChip: {
    backgroundColor: '#FFF3E0',
  },
  draftChip: {
    backgroundColor: '#F3E5F5',
  },
  timecardItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  timecardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timecardType: {
    marginLeft: 8,
    fontWeight: 'bold',
    flex: 1,
  },
  timecardTime: {
    color: '#666',
  },
  timecardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  jobChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  taskChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#999',
  },
  emptyCard: {
    margin: 16,
    elevation: 2,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200EE',
  },
});