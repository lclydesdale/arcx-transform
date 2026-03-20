
import { AirtableResponse, AirtableRecord, AirtableFields } from '../types';

export const fetchAirtableRecords = async (): Promise<AirtableRecord[]> => {
  const url = `/api/airtable`;
  
  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch from Airtable');
    }

    const data: AirtableResponse = await response.json();
    return data.records;
  } catch (error) {
    console.error('Airtable Fetch Error:', error);
    throw error;
  }
};

export const updateAirtableRecord = async (recordId: string, fields: Partial<AirtableFields>): Promise<void> => {
  const url = `/api/airtable/${recordId}`;
  
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update Airtable record');
    }
  } catch (error) {
    console.error('Airtable Update Error:', error);
    throw error;
  }
};
