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
  List,
  Chip,
  FAB,
  Searchbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationService } from '../services/LocationService';

export default function JobSelectionScreen() {
  const [jobSites, setJobSites] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nearbyJobs, setNearbyJobs] = useState([]);

  useEffect(() => {
    loadJobSites();
    getCurrentLocation();
    loadSavedSelection();
  }, []);

  const loadJobSites = async () => {
    try {
      const jobs = await LocationService.getJobSites();
      setJobSites(jobs);
    } catch (error) {
      console.error('Error loading job sites:', error);
      Alert.alert('Error', 'Failed to load job sites');
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await LocationService.getCurrentLocation();
      setCurrentLocation(location);
      await findNearbyJobs(location);
    } catch (error) {
      console.warn('Could not get current location:', error);
    }
  };

  const loadSavedSelection = async () => {
    try {
      const saved = await AsyncStorage.getItem('selectedJobAndTask');
      if (saved) {
        const { job, task } = JSON.parse(saved);
        setSelectedJob(job);
        setSelectedTask(task);
      }
    } catch (error) {
      console.error('Error loading saved selection:', error);
    }
  };

  const findNearbyJobs = async (location) => {
    try {
      const jobs = await LocationService.getJobSites();
      const nearby = [];

      for (const job of jobs) {
        if (job.location) {
          const distance = LocationService.calculateDistance(
            location.latitude,
            location.longitude,
            job.location.latitude,
            job.location.longitude
          );

          if (distance <= 1000) { // Within 1km
            nearby.push({
              ...job,
              distance: Math.round(distance),
            });
          }
        }
      }

      // Sort by distance
      nearby.sort((a, b) => a.distance - b.distance);
      setNearbyJobs(nearby);
    } catch (error) {
      console.error('Error finding nearby jobs:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobSites();
    if (currentLocation) {
      await findNearbyJobs(currentLocation);
    }
    setRefreshing(false);
  };

  const handleJobSelect = (job) => {
    setSelectedJob(job);
    setSelectedTask(null); // Reset task selection
  };

  const handleTaskSelect = (task) => {
    setSelectedTask(task);
  };

  const confirmSelection = () => {
    if (!selectedJob) {
      Alert.alert('No Job Selected', 'Please select a job site first.');
      return;
    }

    Alert.alert(
      'Confirm Selection',
      `Job: ${selectedJob.name}\nTask: ${selectedTask ? selectedTask.name : 'None'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await AsyncStorage.setItem('selectedJobAndTask', JSON.stringify({
                job: selectedJob,
                task: selectedTask,
              }));
              Alert.alert('Success', 'Job and task selection saved!');
            } catch (error) {
              Alert.alert('Error', 'Failed to save selection');
            }
          },
        },
      ]
    );
  };

  const filteredJobs = jobSites.filter(job =>
    job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDistanceText = (job) => {
    const nearbyJob = nearbyJobs.find(nj => nj.id === job.id);
    return nearbyJob ? `${nearbyJob.distance}m away` : '';
  };

  const isNearby = (job) => {
    return nearbyJobs.some(nj => nj.id === job.id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>Select Job & Task</Title>
        {currentLocation && (
          <Paragraph style={styles.locationText}>
            📍 Location services active
          </Paragraph>
        )}
      </View>

      <Searchbar
        placeholder="Search job sites..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {nearbyJobs.length > 0 && (
        <Card style={styles.nearbyCard}>
          <Card.Content>
            <Title style={styles.nearbyTitle}>🎯 Nearby Job Sites</Title>
            {nearbyJobs.slice(0, 3).map(job => (
              <Chip
                key={job.id}
                icon="location-on"
                onPress={() => handleJobSelect(job)}
                selected={selectedJob?.id === job.id}
                style={styles.nearbyChip}
              >
                {job.name} ({job.distance}m)
              </Chip>
            ))}
          </Card.Content>
        </Card>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Selected Job & Task Summary */}
        {(selectedJob || selectedTask) && (
          <Card style={styles.selectionCard}>
            <Card.Content>
              <Title style={styles.selectionTitle}>Current Selection</Title>
              {selectedJob && (
                <View style={styles.selectionItem}>
                  <Icon name="work" size={20} color="#6200EE" />
                  <Text style={styles.selectionText}>{selectedJob.name}</Text>
                </View>
              )}
              {selectedTask && (
                <View style={styles.selectionItem}>
                  <Icon name="assignment" size={20} color="#6200EE" />
                  <Text style={styles.selectionText}>{selectedTask.name}</Text>
                </View>
              )}
              <Button
                mode="contained"
                onPress={confirmSelection}
                style={styles.confirmButton}
                disabled={!selectedJob}
              >
                Confirm Selection
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Job Sites List */}
        <Text style={styles.sectionTitle}>All Job Sites</Text>
        {filteredJobs.map(job => (
          <Card
            key={job.id}
            style={[
              styles.jobCard,
              selectedJob?.id === job.id && styles.selectedJobCard,
              isNearby(job) && styles.nearbyJobCard,
            ]}
            onPress={() => handleJobSelect(job)}
          >
            <Card.Content>
              <View style={styles.jobHeader}>
                <View style={styles.jobInfo}>
                  <Title style={styles.jobName}>{job.name}</Title>
                  <Paragraph style={styles.jobAddress}>{job.address}</Paragraph>
                  {isNearby(job) && (
                    <Chip icon="location-on" compact style={styles.distanceChip}>
                      {getDistanceText(job)}
                    </Chip>
                  )}
                </View>
                <Icon
                  name={selectedJob?.id === job.id ? 'check-circle' : 'radio-button-unchecked'}
                  size={24}
                  color={selectedJob?.id === job.id ? '#4CAF50' : '#999'}
                />
              </View>

              {/* Tasks for selected job */}
              {selectedJob?.id === job.id && job.tasks && (
                <View style={styles.tasksSection}>
                  <Text style={styles.tasksTitle}>Available Tasks:</Text>
                  {job.tasks.map(task => (
                    <List.Item
                      key={task.id}
                      title={task.name}
                      left={() => (
                        <Icon
                          name={selectedTask?.id === task.id ? 'check-circle' : 'radio-button-unchecked'}
                          size={20}
                          color={selectedTask?.id === task.id ? '#4CAF50' : '#999'}
                        />
                      )}
                      onPress={() => handleTaskSelect(task)}
                      style={[
                        styles.taskItem,
                        selectedTask?.id === task.id && styles.selectedTaskItem,
                      ]}
                    />
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        ))}

        {filteredJobs.length === 0 && (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <View style={styles.emptyContent}>
                <Icon name="work-off" size={48} color="#999" />
                <Title style={styles.emptyTitle}>No job sites found</Title>
                <Paragraph style={styles.emptyText}>
                  {searchQuery ? 'Try adjusting your search' : 'No job sites available'}
                </Paragraph>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <FAB
        icon="add"
        style={styles.fab}
        onPress={() => {
          Alert.alert('Add Job Site', 'This feature will be available soon!');
        }}
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
  locationText: {
    color: '#666',
    marginTop: 4,
  },
  searchbar: {
    margin: 16,
    marginTop: 0,
  },
  nearbyCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
  },
  nearbyTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  nearbyChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  selectionCard: {
    margin: 16,
    elevation: 4,
    backgroundColor: '#E8F5E8',
  },
  selectionTitle: {
    fontSize: 16,
    marginBottom: 12,
    color: '#2E7D32',
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectionText: {
    marginLeft: 8,
    fontSize: 16,
  },
  confirmButton: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    margin: 16,
    marginBottom: 8,
    color: '#333',
  },
  jobCard: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  selectedJobCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  nearbyJobCard: {
    borderTopWidth: 2,
    borderTopColor: '#FF9800',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobInfo: {
    flex: 1,
  },
  jobName: {
    fontSize: 18,
    marginBottom: 4,
  },
  jobAddress: {
    color: '#666',
    marginBottom: 8,
  },
  distanceChip: {
    alignSelf: 'flex-start',
  },
  tasksSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  tasksTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  taskItem: {
    paddingLeft: 0,
  },
  selectedTaskItem: {
    backgroundColor: '#E8F5E8',
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