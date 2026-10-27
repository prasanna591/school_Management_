import { Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageHeader } from '../../components/ui';

interface InfoParams {
  title: string;
  body: string;
  meta?: string[];
}

type InfoRoute = RouteProp<{ info: InfoParams }, 'info'>;

/**
 * A tiny informational page reached from the Profile menu (About SmartSchool,
 * Help and Support, Change password). It renders the copy passed in the route
 * params, so no new content or endpoints are introduced.
 */
export function InfoScreen() {
  const route = useRoute<InfoRoute>();
  const { title, body, meta } = route.params ?? { title: 'Info', body: '' };
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <PageHeader title={title} icon="info" />
      <View style={styles.card}>
        <Text style={styles.body}>{body}</Text>
        {meta && meta.length > 0 ? (
          <View style={styles.meta}>
            {meta.map((line) => (
              <Text key={line} style={styles.metaLine}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = {
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 12,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: '#334155',
  },
  meta: {
    gap: 4,
  },
  metaLine: {
    fontSize: 13,
    color: '#0f172a',
  },
} as const;
